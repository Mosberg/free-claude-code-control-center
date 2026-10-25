import * as cp from 'child_process';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as os from 'os';
import * as path from 'path';

export const isWindows = process.platform === 'win32';

/** Resolve whether a command's first token is on PATH. */
export function commandExists(command: string): Promise<boolean> {
  const first = command.trim().split(/\s+/)[0];
  if (!first) {
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    cp.execFile(isWindows ? 'where' : 'which', [first], { timeout: 5000 }, (err) => resolve(!err));
  });
}

/** Run a command and capture stdout (used for `fcc-server --version`). */
export function runCapture(command: string, args: string[], timeoutMs = 15000): Promise<{ ok: boolean; out: string }> {
  return new Promise((resolve) => {
    cp.execFile(command, args, { timeout: timeoutMs, shell: isWindows, windowsHide: true }, (err, stdout, stderr) => {
      resolve({ ok: !err, out: `${stdout ?? ''}${stderr ?? ''}`.trim() });
    });
  });
}

export interface HttpResult {
  status: number;
  body: string;
}

export function httpRequest(
  url: string,
  headers: Record<string, string> = {},
  timeoutMs = 3000,
): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': 'fcc-vscode', ...headers }, timeout: timeoutMs }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

/** Candidate FCC env files (best effort; the Admin UI is the authoritative editor). */
export function fccEnvFiles(): string[] {
  const home = os.homedir();
  return [
    path.join(home, '.fcc', '.env'),
    path.join(home, '.config', 'free-claude-code', '.env'),
  ];
}

export function readFccEnv(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const file of fccEnvFiles().reverse()) {
    try {
      const text = fs.readFileSync(file, 'utf8');
      for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) {
          continue;
        }
        const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
        if (!m) {
          continue;
        }
        let v = m[2].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        result[m[1]] = v;
      }
    } catch {
      /* file missing: ignore */
    }
  }
  return result;
}

export function compareVersions(a: string, b: string): number {
  const norm = (v: string) => v.replace(/^v/i, '').split(/[.+-]/).map((p) => parseInt(p, 10) || 0);
  const pa = norm(a);
  const pb = norm(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) {
      return d;
    }
  }
  return 0;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
