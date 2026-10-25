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
exports.MaintenanceTree = exports.MessagingTree = exports.IntegrationsTree = exports.ProvidersTree = exports.ModelsTree = exports.AgentsTree = exports.StatusTree = void 0;
const vscode = __importStar(require("vscode"));
const catalog_1 = require("./catalog");
const server_1 = require("./server");
const util_1 = require("./util");
class Node extends vscode.TreeItem {
    children;
    constructor(label, opts = {}) {
        super(label, opts.children ? (opts.collapsible === false ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed) : vscode.TreeItemCollapsibleState.None);
        this.description = opts.description;
        this.tooltip = opts.tooltip;
        if (opts.icon) {
            this.iconPath = new vscode.ThemeIcon(opts.icon, opts.color ? new vscode.ThemeColor(opts.color) : undefined);
        }
        this.command = opts.command;
        this.contextValue = opts.contextValue;
        this.children = opts.children;
        this.id = opts.id;
    }
}
class BaseTree {
    emitter = new vscode.EventEmitter();
    onDidChangeTreeData = this.emitter.event;
    refresh() {
        this.emitter.fire(undefined);
    }
    getTreeItem(e) {
        return e;
    }
    getChildren(e) {
        return e ? e.children ?? [] : this.roots();
    }
}
const cmd = (command, title, ...args) => ({ command, title, arguments: args });
class StatusTree extends BaseTree {
    server;
    cliFound = true;
    constructor(server) {
        super();
        this.server = server;
    }
    roots() {
        const s = this.server;
        const nodes = [];
        const icon = s.state === 'running' ? (s.authRequired ? 'lock' : 'check') : s.state === 'starting' ? 'sync~spin' : 'circle-slash';
        const color = s.state === 'running' ? (s.authRequired ? 'charts.yellow' : 'charts.green') : s.state === 'starting' ? 'charts.yellow' : 'charts.red';
        const label = s.state === 'running' ? (s.authRequired ? 'Running — proxy token required' : 'Running') : s.state === 'starting' ? 'Starting…' : 'Stopped';
        nodes.push(new Node(label, {
            icon, color,
            description: s.baseUrl,
            tooltip: s.authRequired
                ? 'The server answered 401/403. Set the same proxy auth token here (FCC: Set Proxy Auth Token) as in Admin UI → Runtime.'
                : undefined,
            command: s.state === 'stopped' ? cmd('fcc.server.start', 'Start') : cmd('fcc.server.checkHealth', 'Check health'),
        }));
        if (s.lastError && s.state === 'stopped') {
            nodes.push(new Node(s.lastError, { icon: 'warning', color: 'charts.yellow', command: cmd('fcc.server.showLogs', 'Logs') }));
        }
        nodes.push(new Node('Open Admin UI', { icon: 'settings-gear', description: s.adminUrl, command: cmd('fcc.server.openAdmin', 'Open Admin UI') }));
        if (s.state === 'stopped') {
            nodes.push(new Node('Start server', { icon: 'play', command: cmd('fcc.server.start', 'Start') }));
        }
        else {
            nodes.push(new Node('Restart server', { icon: 'debug-restart', description: s.startedHere ? 'started from VS Code' : 'external (cannot restart here)', command: cmd('fcc.server.restart', 'Restart') }));
            if (s.startedHere) {
                nodes.push(new Node('Stop server', { icon: 'debug-stop', command: cmd('fcc.server.stop', 'Stop') }));
            }
        }
        nodes.push(new Node('Server logs', { icon: 'output', command: cmd('fcc.server.showLogs', 'Logs') }));
        nodes.push(new Node('Open terminal with FCC environment', { icon: 'terminal', command: cmd('fcc.terminal.withEnv', 'Terminal') }));
        nodes.push(new Node('Copy environment snippet…', { icon: 'copy', description: 'ANTHROPIC_BASE_URL / token', command: cmd('fcc.server.copyEnv', 'Copy env') }));
        nodes.push(new Node('Proxy auth token…', { icon: 'lock', command: cmd('fcc.token.set', 'Set token') }));
        if (s.version) {
            nodes.push(new Node(`Version ${s.version}`, { icon: 'tag', command: cmd('fcc.checkForUpdates', 'Check for updates') }));
        }
        return nodes;
    }
}
exports.StatusTree = StatusTree;
class AgentsTree extends BaseTree {
    overrides;
    installed = new Map();
    constructor(overrides) {
        super();
        this.overrides = overrides;
    }
    async detect() {
        const ov = this.overrides();
        await Promise.all(catalog_1.AGENTS.map(async (a) => this.installed.set(a.id, await (0, util_1.commandExists)(ov[a.id] || a.command))));
        this.refresh();
    }
    roots() {
        return catalog_1.AGENTS.map((a) => {
            const ok = this.installed.get(a.id);
            return new Node(a.label, {
                icon: ok === false ? 'warning' : 'rocket',
                color: ok === false ? 'charts.yellow' : undefined,
                description: a.command + (ok === false ? ' (not found on PATH)' : ''),
                tooltip: `${a.description}\n${a.homepage}`,
                contextValue: 'agent',
                command: cmd('fcc.agent.launch', `Launch ${a.label}`, a.id),
                id: `agent.${a.id}`,
            });
        });
    }
}
exports.AgentsTree = AgentsTree;
class ModelsTree extends BaseTree {
    server;
    constructor(server) {
        super();
        this.server = server;
    }
    roots() {
        const s = this.server;
        const nodes = [];
        if (s.state !== 'running') {
            return nodes;
        }
        if (s.authRequired) {
            return [new Node('Proxy token required to list models', { icon: 'lock', command: cmd('fcc.token.set', 'Set token') })];
        }
        const tiers = new Node('Routing (launch-time overrides)', {
            icon: 'git-compare',
            children: [
                new Node('MODEL (fallback for every request)…', { icon: 'symbol-event', command: cmd('fcc.model.set', 'Set MODEL') }),
                ...catalog_1.MODEL_TIERS.map((t) => new Node(`${t.label} tier…`, { icon: 'symbol-event', description: t.env, command: cmd('fcc.model.setTier', 'Set tier', t.env) })),
                new Node('Fallbacks & reasoning guide', { icon: 'book', command: cmd('fcc.guide.routing', 'Guide') }),
            ],
        });
        nodes.push(tiers);
        nodes.push(new Node(`Exposed by FCC (${s.models.length})`, {
            icon: 'symbol-class',
            collapsible: false,
            children: s.models.map((m) => new Node(m.name ? `${m.name}` : m.id, {
                icon: 'symbol-field',
                description: m.name ? m.id : undefined,
                contextValue: 'model',
                tooltip: `${m.id}\nClick to copy.`,
                command: cmd('fcc.models.copy', 'Copy model ID', m.id),
            })),
        }));
        return nodes;
    }
}
exports.ModelsTree = ModelsTree;
class ProvidersTree extends BaseTree {
    ctx;
    stored = new Set();
    constructor(ctx) {
        super();
        this.ctx = ctx;
    }
    async detect() {
        const next = new Set();
        for (const p of catalog_1.PROVIDERS) {
            for (const v of p.env) {
                const val = v.secret ? await this.ctx.secrets.get((0, server_1.credentialKey)(v.name)) : this.ctx.globalState.get((0, server_1.credentialKey)(v.name));
                if (val) {
                    next.add(v.name);
                }
            }
        }
        this.stored = next;
        this.refresh();
    }
    node(p) {
        const has = p.env.length > 0 && p.env.filter((v) => !v.optional).every((v) => this.stored.has(v.name));
        const desc = p.kind === 'oauth' ? 'Connect in Admin UI' : p.env.map((e) => e.name).join(' + ');
        const tip = new vscode.MarkdownString(`**${p.name}** \`${p.id}/\`\n\nExample: \`${p.example}\`\n\n${p.note ?? ''}\n\n[Key / docs](${p.url})`);
        return new Node(p.name, {
            icon: has ? 'pass-filled' : p.kind === 'oauth' ? 'account' : p.kind === 'local' ? 'server' : 'key',
            color: has ? 'charts.green' : undefined,
            description: desc,
            tooltip: tip,
            contextValue: 'provider',
            command: cmd('fcc.provider.pick', p.name, p.id),
            id: `provider.${p.id}`,
        });
    }
    roots() {
        const group = (title, icon, kinds) => {
            const list = catalog_1.PROVIDERS.filter((p) => kinds.includes(p.kind));
            return new Node(`${title} (${list.length})`, { icon, children: list.map((p) => this.node(p)) });
        };
        return [
            group('Cloud providers (API key)', 'cloud', ['cloud']),
            group('OAuth / subscription', 'account', ['oauth']),
            group('Application Default Credentials', 'shield', ['adc']),
            group('Local servers', 'server', ['local']),
            new Node('Custom provider (any API endpoint)', { icon: 'add', description: 'Admin UI → Providers → Custom providers', command: cmd('fcc.server.openAdmin', 'Open Admin UI') }),
            new Node('Full catalog table', { icon: 'table', command: cmd('fcc.guide.providers', 'Catalog') }),
        ];
    }
}
exports.ProvidersTree = ProvidersTree;
class IntegrationsTree extends BaseTree {
    roots() {
        const nodes = catalog_1.INTEGRATIONS.map((i) => {
            const installed = i.extensionId ? !!vscode.extensions.getExtension(i.extensionId) : undefined;
            return new Node(i.label, {
                icon: installed === false ? 'cloud-download' : 'plug',
                color: installed ? 'charts.green' : undefined,
                description: installed === undefined ? i.description : installed ? 'extension installed' : 'extension not installed',
                tooltip: new vscode.MarkdownString(`**${i.label}**\n\n${i.steps}`),
                contextValue: i.extensionId && !installed ? 'integration-install' : 'integration',
                command: cmd('fcc.integration.connect', 'Connect', i.id),
                id: `integration.${i.id}`,
            });
        });
        nodes.push(new Node('Point Claude Code for VS Code at FCC', { icon: 'settings', description: 'writes claudeCode.environmentVariables', command: cmd('fcc.claudeCode.configure', 'Configure') }));
        nodes.push(new Node('Remove FCC from Claude Code for VS Code', { icon: 'discard', command: cmd('fcc.claudeCode.unconfigure', 'Remove') }));
        nodes.push(new Node('All integration instructions', { icon: 'book', command: cmd('fcc.guide.integrations', 'Guide') }));
        return nodes;
    }
}
exports.IntegrationsTree = IntegrationsTree;
class MessagingTree extends BaseTree {
    roots() {
        return [
            new Node('Discord bot setup', { icon: 'comment-discussion', command: cmd('fcc.messaging.guide', 'Discord', 'discord') }),
            new Node('Telegram bot setup', { icon: 'send', command: cmd('fcc.messaging.guide', 'Telegram', 'telegram') }),
            new Node('Messaging commands (/stats /stop /clear)', { icon: 'terminal', command: cmd('fcc.messaging.commands', 'Commands') }),
            new Node('Voice notes (NVIDIA NIM / local Whisper)', { icon: 'mic', command: cmd('fcc.voice.guide', 'Voice') }),
            new Node('Install local Whisper support…', { icon: 'cloud-download', command: cmd('fcc.voice.installLocal', 'Install') }),
            new Node('Open Admin UI → Messaging', { icon: 'settings-gear', command: cmd('fcc.server.openAdmin', 'Admin') }),
        ];
    }
}
exports.MessagingTree = MessagingTree;
class MaintenanceTree extends BaseTree {
    roots() {
        const n = (label, icon, command, description) => new Node(label, { icon, description, command: cmd(command, label) });
        return [
            n('Install Free Claude Code…', 'cloud-download', 'fcc.install'),
            n('Update (fcc-update)', 'sync', 'fcc.update'),
            n('Check for updates', 'search', 'fcc.checkForUpdates'),
            n('Run diagnostics (fcc-doctor)', 'heart', 'fcc.doctor'),
            n('Local provider guide', 'server', 'fcc.guide.localProviders'),
            n('Routing, fallbacks & reasoning', 'book', 'fcc.guide.routing'),
            n('Muse Code: install / update (Windows)', 'cloud-download', 'fcc.muse.install'),
            n('Muse Code: remove (Windows)', 'trash', 'fcc.muse.uninstall'),
            n('Uninstall Free Claude Code…', 'trash', 'fcc.uninstall'),
            n('Report a bug', 'bug', 'fcc.reportIssue'),
            n('FCC repository', 'github', 'fcc.openRepo'),
            n('Extension settings', 'gear', 'fcc.openSettings'),
            n('Getting-started walkthrough', 'mortar-board', 'fcc.walkthrough'),
        ];
    }
}
exports.MaintenanceTree = MaintenanceTree;
//# sourceMappingURL=views.js.map