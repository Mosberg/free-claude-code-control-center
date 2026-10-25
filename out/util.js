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
exports.isWindows = void 0;
exports.commandExists = commandExists;
exports.runCapture = runCapture;
exports.httpRequest = httpRequest;
exports.fccEnvFiles = fccEnvFiles;
exports.readFccEnv = readFccEnv;
exports.compareVersions = compareVersions;
exports.sleep = sleep;
const cp = __importStar(require("child_process"));
const fs = __importStar(require("fs"));
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
exports.isWindows = process.platform === 'win32';
/** Resolve whether a command's first token is on PATH. */
function commandExists(command) {
    const first = command.trim().split(/\s+/)[0];
    if (!first) {
        return Promise.resolve(false);
    }
    return new Promise((resolve) => {
        cp.execFile(exports.isWindows ? 'where' : 'which', [first], { timeout: 5000 }, (err) => resolve(!err));
    });
}
/** Run a command and capture stdout (used for `fcc-server --version`). */
function runCapture(command, args, timeoutMs = 15000) {
    return new Promise((resolve) => {
        cp.execFile(command, args, { timeout: timeoutMs, shell: exports.isWindows, windowsHide: true }, (err, stdout, stderr) => {
            resolve({ ok: !err, out: `${stdout ?? ''}${stderr ?? ''}`.trim() });
        });
    });
}
function httpRequest(url, headers = {}, timeoutMs = 3000) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https:') ? https : http;
        const req = lib.get(url, { headers: { 'User-Agent': 'fcc-vscode', ...headers }, timeout: timeoutMs }, (res) => {
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }));
        });
        req.on('timeout', () => req.destroy(new Error('timeout')));
        req.on('error', reject);
    });
}
/** Candidate FCC env files (best effort; the Admin UI is the authoritative editor). */
function fccEnvFiles() {
    const home = os.homedir();
    return [
        path.join(home, '.fcc', '.env'),
        path.join(home, '.config', 'free-claude-code', '.env'),
    ];
}
function readFccEnv() {
    const result = {};
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
        }
        catch {
            /* file missing: ignore */
        }
    }
    return result;
}
function compareVersions(a, b) {
    const norm = (v) => v.replace(/^v/i, '').split(/[.+-]/).map((p) => parseInt(p, 10) || 0);
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
function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
//# sourceMappingURL=util.js.map