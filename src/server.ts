import * as cp from 'child_process';
import * as os from 'os';
import * as vscode from 'vscode';
import { PROVIDERS } from './catalog';
import { httpRequest, isWindows, readFccEnv, runCapture, sleep } from './util';

export type ServerState = 'stopped' | 'starting' | 'running';

export interface ModelInfo {
  id: string;
  name?: string;
}

const TOKEN_SECRET = 'fcc.proxyAuthToken';
export const credentialKey = (envName: string) => `fcc.cred.${envName}`;

export class ServerManager implements vscode.Disposable {
  private child?: cp.ChildProcess;
  private terminal?: vscode.Terminal;
  private timer?: NodeJS.Timeout;
  private detectedPort?: number;
  private _state: ServerState = 'stopped';
  private _authRequired = false;
  private _startedHere = false;
  private _version?: string;
  private _models: ModelInfo[] = [];
  private _lastError?: string;

  readonly output = vscode.window.createOutputChannel('Free Claude Code');
  private readonly emitter = new vscode.EventEmitter<void>();
  readonly onDidChange = this.emitter.event;

  constructor(private readonly ctx: vscode.ExtensionContext) {}

  // ----- configuration helpers -------------------------------------------------

  private cfg() {
    return vscode.workspace.getConfiguration('fcc');
  }

  private explicit<T>(key: string): T | undefined {
    const i = this.cfg().inspect<T>(key);
    return i?.workspaceFolderValue ?? i?.workspaceValue ?? i?.globalValue;
  }

  get host(): string {
    const fromCfg = this.explicit<string>('server.host');
    if (fromCfg) {
      return fromCfg;
    }
    if (this.cfg().get<boolean>('server.readFccEnvFile', true)) {
      const h = readFccEnv().HOST;
      if (h && h !== '0.0.0.0') {
        return h;
      }
    }
    return '127.0.0.1';
  }

  get port(): number {
    const fromCfg = this.explicit<number>('server.port');
    if (fromCfg) {
      return fromCfg;
    }
    if (this.detectedPort) {
      return this.detectedPort;
    }
    if (this.cfg().get<boolean>('server.readFccEnvFile', true)) {
      const p = parseInt(readFccEnv().PORT ?? '', 10);
      if (p > 0) {
        return p;
      }
    }
    return this.cfg().get<number>('server.port', 8082);
  }

  get baseUrl(): string {
    return `http://${this.host}:${this.port}`;
  }

  get adminUrl(): string {
    const p = this.cfg().get<string>('adminUi.path', '/admin');
    return `${this.baseUrl}${p.startsWith('/') ? p : '/' + p}`;
  }

  get state(): ServerState {
    return this._state;
  }
  get authRequired(): boolean {
    return this._authRequired;
  }
  get startedHere(): boolean {
    return this._startedHere;
  }
  get version(): string | undefined {
    return this._version;
  }
  get models(): ModelInfo[] {
    return this._models;
  }
  get lastError(): string | undefined {
    return this._lastError;
  }

  // ----- secrets ---------------------------------------------------------------

  async getToken(): Promise<string | undefined> {
    const stored = await this.ctx.secrets.get(TOKEN_SECRET);
    if (stored) {
      return stored;
    }
    if (this.cfg().get<boolean>('server.readFccEnvFile', true)) {
      return readFccEnv().ANTHROPIC_AUTH_TOKEN || undefined;
    }
    return undefined;
  }
  async setToken(token: string): Promise<void> {
    await this.ctx.secrets.store(TOKEN_SECRET, token);
    this.emitter.fire();
  }
  async clearToken(): Promise<void> {
    await this.ctx.secrets.delete(TOKEN_SECRET);
    this.emitter.fire();
  }
  async hasStoredToken(): Promise<boolean> {
    return !!(await this.ctx.secrets.get(TOKEN_SECRET));
  }

  /** All provider credentials the user stored through the extension. */
  async collectProviderEnv(): Promise<Record<string, string>> {
    const env: Record<string, string> = {};
    const seen = new Set<string>();
    for (const p of PROVIDERS) {
      for (const v of p.env) {
        if (seen.has(v.name)) {
          continue;
        }
        seen.add(v.name);
        const value = v.secret
          ? await this.ctx.secrets.get(credentialKey(v.name))
          : this.ctx.globalState.get<string>(credentialKey(v.name));
        if (value) {
          env[v.name] = value;
        }
      }
    }
    return env;
  }

  // ----- command resolution ----------------------------------------------------

  get serverCommand(): string {
    const base = this.cfg().get<string>('server.command', 'fcc-server').trim() || 'fcc-server';
    const extra = this.cfg().get<string[]>('server.extraArgs', []);
    return [base, ...extra].join(' ');
  }

  private get cwd(): string {
    return this.cfg().get<string>('server.cwd', '') || os.homedir();
  }

  async buildEnv(): Promise<NodeJS.ProcessEnv> {
    const env: NodeJS.ProcessEnv = { ...process.env, ...(await this.collectProviderEnv()) };
    Object.assign(env, this.cfg().get<Record<string, string>>('server.env', {}));
    const hostCfg = this.explicit<string>('server.host');
    const portCfg = this.explicit<number>('server.port');
    if (hostCfg) {
      env.HOST = hostCfg;
    }
    if (portCfg) {
      env.PORT = String(portCfg);
    }
    if (this.cfg().get<boolean>('auth.injectIntoServer', false)) {
      const t = await this.getToken();
      if (t) {
        env.ANTHROPIC_AUTH_TOKEN = t;
      }
    }
    return env;
  }

  // ----- lifecycle -------------------------------------------------------------

  start(): void {
    this.timer = setInterval(() => void this.poll(), this.pollMs());
    void this.poll();
    this.ctx.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('fcc.server.healthCheckIntervalSeconds')) {
          if (this.timer) {
            clearInterval(this.timer);
          }
          this.timer = setInterval(() => void this.poll(), this.pollMs());
        }
      }),
      vscode.window.onDidCloseTerminal((t) => {
        if (t === this.terminal) {
          this.terminal = undefined;
          this._startedHere = false;
        }
      }),
    );
  }

  private pollMs(): number {
    return Math.max(2, this.cfg().get<number>('server.healthCheckIntervalSeconds', 10)) * 1000;
  }

  async probe(): Promise<{ up: boolean; auth: boolean; models: ModelInfo[] }> {
    const token = await this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      headers['x-api-key'] = token;
    }
    try {
      const res = await httpRequest(`${this.baseUrl}/v1/models`, headers, 2500);
      if (res.status === 401 || res.status === 403) {
        return { up: true, auth: true, models: [] };
      }
      if (res.status >= 200 && res.status < 300) {
        let models: ModelInfo[] = [];
        try {
          const json = JSON.parse(res.body) as { data?: Array<{ id?: string; display_name?: string; name?: string }> };
          models = (json.data ?? [])
            .filter((m) => typeof m.id === 'string')
            .map((m) => ({ id: m.id as string, name: m.display_name ?? m.name }));
        } catch {
          /* not JSON */
        }
        return { up: true, auth: false, models };
      }
      return { up: true, auth: false, models: [] };
    } catch {
      return { up: false, auth: false, models: [] };
    }
  }

  async poll(): Promise<void> {
    const before = `${this._state}|${this._authRequired}|${this._models.length}`;
    const r = await this.probe();
    if (r.up) {
      this._state = 'running';
      this._authRequired = r.auth;
      this._models = r.models;
    } else if (this._state !== 'starting') {
      this._state = 'stopped';
      this._authRequired = false;
      this._models = [];
    }
    await vscode.commands.executeCommand('setContext', 'fcc.serverState', this._state);
    if (before !== `${this._state}|${this._authRequired}|${this._models.length}`) {
      this.emitter.fire();
    }
  }

  async refreshVersion(): Promise<string | undefined> {
    const base = this.cfg().get<string>('server.command', 'fcc-server').trim().split(/\s+/);
    const r = await runCapture(base[0], [...base.slice(1), '--version']);
    if (r.ok) {
      const m = /(\d+\.\d+[^\s]*)/.exec(r.out);
      this._version = m ? m[1] : r.out;
      this.emitter.fire();
    }
    return this._version;
  }

  async startServer(): Promise<boolean> {
    if (!vscode.workspace.isTrusted) {
      vscode.window.showWarningMessage('FCC: starting the server is disabled in untrusted workspaces.');
      return false;
    }
    await this.poll();
    if (this._state === 'running') {
      vscode.window.showInformationMessage(`FCC server is already running at ${this.baseUrl}.`);
      return true;
    }
    this._state = 'starting';
    this._lastError = undefined;
    this.emitter.fire();
    const env = await this.buildEnv();
    const runIn = this.cfg().get<string>('server.runIn', 'background');
    this.output.appendLine(`> ${this.serverCommand}  (cwd: ${this.cwd})`);

    if (runIn === 'terminal') {
      this.terminal = vscode.window.createTerminal({ name: 'FCC Server', cwd: this.cwd, env: this.toStringEnv(env) });
      this.terminal.show(true);
      this.terminal.sendText(this.serverCommand);
      this._startedHere = true;
    } else {
      this.child = cp.spawn(this.serverCommand, {
        cwd: this.cwd,
        env,
        shell: true,
        detached: !isWindows,
        windowsHide: true,
      });
      this._startedHere = true;
      const onData = (buf: Buffer) => {
        const text = buf.toString();
        this.output.append(text);
        const m = /(?:Admin UI|Server URL|Uvicorn running on)[^\n]*?https?:\/\/[^\s:/]+:(\d{2,5})/i.exec(text);
        if (m) {
          this.detectedPort = parseInt(m[1], 10);
        }
      };
      this.child.stdout?.on('data', onData);
      this.child.stderr?.on('data', onData);
      this.child.on('error', (err) => {
        this._lastError = err.message;
        this.output.appendLine(`[error] ${err.message}`);
      });
      this.child.on('exit', (code) => {
        this.output.appendLine(`[server exited with code ${code}]`);
        this.child = undefined;
        this._startedHere = false;
        if (this._state === 'starting') {
          this._lastError = `Server exited with code ${code} before becoming healthy. See the FCC output channel.`;
        }
        void this.poll();
      });
    }

    const deadline = Date.now() + this.cfg().get<number>('server.startTimeoutSeconds', 90) * 1000;
    while (Date.now() < deadline) {
      await sleep(1000);
      const r = await this.probe();
      if (r.up) {
        await this.poll();
        void this.refreshVersion();
        return true;
      }
      if (runIn !== 'terminal' && !this.child) {
        break;
      }
    }
    this._state = 'stopped';
    this._lastError = this._lastError ?? 'Timed out waiting for the FCC server to become healthy.';
    this.emitter.fire();
    this.output.show(true);
    vscode.window.showErrorMessage(`FCC: ${this._lastError}`, 'Show Logs', 'Run Diagnostics').then((c) => {
      if (c === 'Show Logs') {
        this.output.show();
      } else if (c === 'Run Diagnostics') {
        void vscode.commands.executeCommand('fcc.doctor');
      }
    });
    return false;
  }

  private toStringEnv(env: NodeJS.ProcessEnv): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(env)) {
      if (typeof v === 'string') {
        out[k] = v;
      }
    }
    return out;
  }

  async stopServer(): Promise<void> {
    if (!this._startedHere) {
      vscode.window.showInformationMessage(
        'FCC: the running server was not started from VS Code. Stop it from its terminal, or from the tray / menu-bar icon (Windows/macOS).',
      );
      return;
    }
    if (this.terminal) {
      this.terminal.sendText('\u0003', false);
      await sleep(500);
      this.terminal.dispose();
      this.terminal = undefined;
    }
    if (this.child?.pid) {
      const pid = this.child.pid;
      try {
        if (isWindows) {
          cp.execFile('taskkill', ['/pid', String(pid), '/T', '/F']);
        } else {
          process.kill(-pid, 'SIGTERM');
        }
      } catch (e) {
        this.output.appendLine(`[warn] could not stop process: ${String(e)}`);
        this.child.kill();
      }
    }
    this._startedHere = false;
    await sleep(800);
    await this.poll();
  }

  async restart(): Promise<void> {
    if (this._state === 'running' && !this._startedHere) {
      vscode.window.showWarningMessage(
        'FCC: this server was not started from VS Code, so it cannot be restarted here. Use the Admin UI / tray icon, or stop it and start it from VS Code.',
      );
      return;
    }
    await this.stopServer();
    await this.startServer();
  }

  dispose(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    if (this.cfg().get<boolean>('server.stopOnExit', true) && this._startedHere) {
      try {
        if (this.child?.pid) {
          if (isWindows) {
            cp.execFile('taskkill', ['/pid', String(this.child.pid), '/T', '/F']);
          } else {
            process.kill(-this.child.pid, 'SIGTERM');
          }
        }
        this.terminal?.dispose();
      } catch {
        /* best effort */
      }
    }
    this.output.dispose();
    this.emitter.dispose();
  }
}
