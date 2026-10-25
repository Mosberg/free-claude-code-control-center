"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerManager = exports.credentialKey = void 0;
const cp = __importStar(require("child_process"));
const os = __importStar(require("os"));
const vscode = __importStar(require("vscode"));
const catalog_1 = require("./catalog");
const util_1 = require("./util");
const TOKEN_SECRET = 'fcc.proxyAuthToken';
const credentialKey = (envName) => `fcc.cred.${envName}`;
exports.credentialKey = credentialKey;
class ServerManager {
    ctx;
    child;
    terminal;
    timer;
    detectedPort;
    _state = 'stopped';
    _authRequired = false;
    _startedHere = false;
    _version;
    _models = [];
    _lastError;
    output = vscode.window.createOutputChannel('Free Claude Code');
    emitter = new vscode.EventEmitter();
    onDidChange = this.emitter.event;
    constructor(ctx) {
        this.ctx = ctx;
    }
    // ----- configuration helpers -------------------------------------------------
    cfg() {
        return vscode.workspace.getConfiguration('fcc');
    }
    explicit(key) {
        const i = this.cfg().inspect(key);
        return i?.workspaceFolderValue ?? i?.workspaceValue ?? i?.globalValue;
    }
    get host() {
        const fromCfg = this.explicit('server.host');
        if (fromCfg) {
            return fromCfg;
        }
        if (this.cfg().get('server.readFccEnvFile', true)) {
            const h = (0, util_1.readFccEnv)().HOST;
            if (h && h !== '0.0.0.0') {
                return h;
            }
        }
        return '127.0.0.1';
    }
    get port() {
        const fromCfg = this.explicit('server.port');
        if (fromCfg) {
            return fromCfg;
        }
        if (this.detectedPort) {
            return this.detectedPort;
        }
        if (this.cfg().get('server.readFccEnvFile', true)) {
            const p = parseInt((0, util_1.readFccEnv)().PORT ?? '', 10);
            if (p > 0) {
                return p;
            }
        }
        return this.cfg().get('server.port', 8082);
    }
    get baseUrl() {
        return `http://${this.host}:${this.port}`;
    }
    get adminUrl() {
        const p = this.cfg().get('adminUi.path', '/admin');
        return `${this.baseUrl}${p.startsWith('/') ? p : '/' + p}`;
    }
    get state() {
        return this._state;
    }
    get authRequired() {
        return this._authRequired;
    }
    get startedHere() {
        return this._startedHere;
    }
    get version() {
        return this._version;
    }
    get models() {
        return this._models;
    }
    get lastError() {
        return this._lastError;
    }
    // ----- secrets ---------------------------------------------------------------
    async getToken() {
        const stored = await this.ctx.secrets.get(TOKEN_SECRET);
        if (stored) {
            return stored;
        }
        if (this.cfg().get('server.readFccEnvFile', true)) {
            return (0, util_1.readFccEnv)().ANTHROPIC_AUTH_TOKEN || undefined;
        }
        return undefined;
    }
    async setToken(token) {
        await this.ctx.secrets.store(TOKEN_SECRET, token);
        this.emitter.fire();
    }
    async clearToken() {
        await this.ctx.secrets.delete(TOKEN_SECRET);
        this.emitter.fire();
    }
    async hasStoredToken() {
        return !!(await this.ctx.secrets.get(TOKEN_SECRET));
    }
    /** All provider credentials the user stored through the extension. */
    async collectProviderEnv() {
        const env = {};
        const seen = new Set();
        for (const p of catalog_1.PROVIDERS) {
            for (const v of p.env) {
                if (seen.has(v.name)) {
                    continue;
                }
                seen.add(v.name);
                const value = v.secret
                    ? await this.ctx.secrets.get((0, exports.credentialKey)(v.name))
                    : this.ctx.globalState.get((0, exports.credentialKey)(v.name));
                if (value) {
                    env[v.name] = value;
                }
            }
        }
        return env;
    }
    // ----- command resolution ----------------------------------------------------
    get serverCommand() {
        const base = this.cfg().get('server.command', 'fcc-server').trim() || 'fcc-server';
        const extra = this.cfg().get('server.extraArgs', []);
        return [base, ...extra].join(' ');
    }
    get cwd() {
        return this.cfg().get('server.cwd', '') || os.homedir();
    }
    async buildEnv() {
        const env = { ...process.env, ...(await this.collectProviderEnv()) };
        Object.assign(env, this.cfg().get('server.env', {}));
        const hostCfg = this.explicit('server.host');
        const portCfg = this.explicit('server.port');
        if (hostCfg) {
            env.HOST = hostCfg;
        }
        if (portCfg) {
            env.PORT = String(portCfg);
        }
        if (this.cfg().get('auth.injectIntoServer', false)) {
            const t = await this.getToken();
            if (t) {
                env.ANTHROPIC_AUTH_TOKEN = t;
            }
        }
        return env;
    }
    // ----- lifecycle -------------------------------------------------------------
    start() {
        this.timer = setInterval(() => void this.poll(), this.pollMs());
        void this.poll();
        this.ctx.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('fcc.server.healthCheckIntervalSeconds')) {
                if (this.timer) {
                    clearInterval(this.timer);
                }
                this.timer = setInterval(() => void this.poll(), this.pollMs());
            }
        }), vscode.window.onDidCloseTerminal((t) => {
            if (t === this.terminal) {
                this.terminal = undefined;
                this._startedHere = false;
            }
        }));
    }
    pollMs() {
        return Math.max(2, this.cfg().get('server.healthCheckIntervalSeconds', 10)) * 1000;
    }
    async probe() {
        const token = await this.getToken();
        const headers = {};
        if (token) {
            headers.Authorization = `Bearer ${token}`;
            headers['x-api-key'] = token;
        }
        try {
            const res = await (0, util_1.httpRequest)(`${this.baseUrl}/v1/models`, headers, 2500);
            if (res.status === 401 || res.status === 403) {
                return { up: true, auth: true, models: [] };
            }
            if (res.status >= 200 && res.status < 300) {
                let models = [];
                try {
                    const json = JSON.parse(res.body);
                    models = (json.data ?? [])
                        .filter((m) => typeof m.id === 'string')
                        .map((m) => ({ id: m.id, name: m.display_name ?? m.name }));
                }
                catch {
                    /* not JSON */
                }
                return { up: true, auth: false, models };
            }
            return { up: true, auth: false, models: [] };
        }
        catch {
            return { up: false, auth: false, models: [] };
        }
    }
    async poll() {
        const before = `${this._state}|${this._authRequired}|${this._models.length}`;
        const r = await this.probe();
        if (r.up) {
            this._state = 'running';
            this._authRequired = r.auth;
            this._models = r.models;
        }
        else if (this._state !== 'starting') {
            this._state = 'stopped';
            this._authRequired = false;
            this._models = [];
        }
        await vscode.commands.executeCommand('setContext', 'fcc.serverState', this._state);
        if (before !== `${this._state}|${this._authRequired}|${this._models.length}`) {
            this.emitter.fire();
        }
    }
    async refreshVersion() {
        const base = this.cfg().get('server.command', 'fcc-server').trim().split(/\s+/);
        const r = await (0, util_1.runCapture)(base[0], [...base.slice(1), '--version']);
        if (r.ok) {
            const m = /(\d+\.\d+[^\s]*)/.exec(r.out);
            this._version = m ? m[1] : r.out;
            this.emitter.fire();
        }
        return this._version;
    }
    async startServer() {
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
        const runIn = this.cfg().get('server.runIn', 'background');
        this.output.appendLine(`> ${this.serverCommand}  (cwd: ${this.cwd})`);
        if (runIn === 'terminal') {
            this.terminal = vscode.window.createTerminal({ name: 'FCC Server', cwd: this.cwd, env: this.toStringEnv(env) });
            this.terminal.show(true);
            this.terminal.sendText(this.serverCommand);
            this._startedHere = true;
        }
        else {
            this.child = cp.spawn(this.serverCommand, {
                cwd: this.cwd,
                env,
                shell: true,
                detached: !util_1.isWindows,
                windowsHide: true,
            });
            this._startedHere = true;
            const onData = (buf) => {
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
        const deadline = Date.now() + this.cfg().get('server.startTimeoutSeconds', 90) * 1000;
        while (Date.now() < deadline) {
            await (0, util_1.sleep)(1000);
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
            }
            else if (c === 'Run Diagnostics') {
                void vscode.commands.executeCommand('fcc.doctor');
            }
        });
        return false;
    }
    toStringEnv(env) {
        const out = {};
        for (const [k, v] of Object.entries(env)) {
            if (typeof v === 'string') {
                out[k] = v;
            }
        }
        return out;
    }
    async stopServer() {
        if (!this._startedHere) {
            vscode.window.showInformationMessage('FCC: the running server was not started from VS Code. Stop it from its terminal, or from the tray / menu-bar icon (Windows/macOS).');
            return;
        }
        if (this.terminal) {
            this.terminal.sendText('\u0003', false);
            await (0, util_1.sleep)(500);
            this.terminal.dispose();
            this.terminal = undefined;
        }
        if (this.child?.pid) {
            const pid = this.child.pid;
            try {
                if (util_1.isWindows) {
                    cp.execFile('taskkill', ['/pid', String(pid), '/T', '/F']);
                }
                else {
                    process.kill(-pid, 'SIGTERM');
                }
            }
            catch (e) {
                this.output.appendLine(`[warn] could not stop process: ${String(e)}`);
                this.child.kill();
            }
        }
        this._startedHere = false;
        await (0, util_1.sleep)(800);
        await this.poll();
    }
    async restart() {
        if (this._state === 'running' && !this._startedHere) {
            vscode.window.showWarningMessage('FCC: this server was not started from VS Code, so it cannot be restarted here. Use the Admin UI / tray icon, or stop it and start it from VS Code.');
            return;
        }
        await this.stopServer();
        await this.startServer();
    }
    dispose() {
        if (this.timer) {
            clearInterval(this.timer);
        }
        if (this.cfg().get('server.stopOnExit', true) && this._startedHere) {
            try {
                if (this.child?.pid) {
                    if (util_1.isWindows) {
                        cp.execFile('taskkill', ['/pid', String(this.child.pid), '/T', '/F']);
                    }
                    else {
                        process.kill(-this.child.pid, 'SIGTERM');
                    }
                }
                this.terminal?.dispose();
            }
            catch {
                /* best effort */
            }
        }
        this.output.dispose();
        this.emitter.dispose();
    }
}
exports.ServerManager = ServerManager;
//# sourceMappingURL=server.js.map