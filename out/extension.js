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
exports.activate = activate;
exports.deactivate = deactivate;
const crypto = __importStar(require("crypto"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const catalog_1 = require("./catalog");
const guides_1 = require("./guides");
const server_1 = require("./server");
const views_1 = require("./views");
const util_1 = require("./util");
const EXT_FULL_ID = 'mosberg.free-claude-code-control-center';
function activate(ctx) {
    const server = new server_1.ServerManager(ctx);
    ctx.subscriptions.push(server);
    const cfg = () => vscode.workspace.getConfiguration('fcc');
    // ---------- views ----------
    const statusTree = new views_1.StatusTree(server);
    const agentsTree = new views_1.AgentsTree(() => cfg().get('agents.commands', {}));
    const modelsTree = new views_1.ModelsTree(server);
    const providersTree = new views_1.ProvidersTree(ctx);
    const integrationsTree = new views_1.IntegrationsTree();
    const messagingTree = new views_1.MessagingTree();
    const maintenanceTree = new views_1.MaintenanceTree();
    ctx.subscriptions.push(vscode.window.createTreeView('fcc.status', { treeDataProvider: statusTree }), vscode.window.createTreeView('fcc.agents', { treeDataProvider: agentsTree }), vscode.window.createTreeView('fcc.models', { treeDataProvider: modelsTree }), vscode.window.createTreeView('fcc.providers', { treeDataProvider: providersTree }), vscode.window.createTreeView('fcc.integrations', { treeDataProvider: integrationsTree }), vscode.window.createTreeView('fcc.messaging', { treeDataProvider: messagingTree }), vscode.window.createTreeView('fcc.maintenance', { treeDataProvider: maintenanceTree }));
    // ---------- status bar ----------
    const bar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 90);
    bar.command = 'fcc.menu';
    ctx.subscriptions.push(bar);
    const renderBar = () => {
        if (!cfg().get('statusBar.enabled', true)) {
            bar.hide();
            return;
        }
        const align = cfg().get('statusBar.alignment', 'right') === 'left' ? vscode.StatusBarAlignment.Left : vscode.StatusBarAlignment.Right;
        if (bar.alignment !== align) {
            // alignment cannot be changed in place: recreate lazily on next reload
        }
        switch (server.state) {
            case 'running':
                bar.text = server.authRequired ? '$(lock) FCC' : `$(zap) FCC :${server.port}`;
                bar.tooltip = server.authRequired ? 'FCC is running but needs the proxy token (FCC: Set Proxy Auth Token)' : `FCC running at ${server.baseUrl}`;
                bar.backgroundColor = server.authRequired ? new vscode.ThemeColor('statusBarItem.warningBackground') : undefined;
                break;
            case 'starting':
                bar.text = '$(sync~spin) FCC starting…';
                bar.tooltip = 'Waiting for the FCC server to become healthy';
                bar.backgroundColor = undefined;
                break;
            default:
                bar.text = '$(circle-slash) FCC';
                bar.tooltip = 'FCC server is not running. Click for the FCC menu.';
                bar.backgroundColor = undefined;
        }
        bar.show();
    };
    const refreshAll = () => {
        statusTree.refresh();
        modelsTree.refresh();
        integrationsTree.refresh();
        renderBar();
    };
    ctx.subscriptions.push(server.onDidChange(refreshAll));
    // ---------- terminal environment injection ----------
    const applyTerminalEnv = async () => {
        const coll = ctx.environmentVariableCollection;
        coll.clear();
        if (!cfg().get('terminal.injectEnv', false)) {
            return;
        }
        coll.replace('ANTHROPIC_BASE_URL', server.baseUrl);
        const t = await server.getToken();
        if (t) {
            coll.replace('ANTHROPIC_AUTH_TOKEN', t);
        }
    };
    ctx.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('fcc')) {
            void applyTerminalEnv();
            void agentsTree.detect();
            refreshAll();
        }
    }), vscode.extensions.onDidChange(() => integrationsTree.refresh()));
    // ---------- helpers ----------
    const open = (url) => vscode.env.openExternal(vscode.Uri.parse(url));
    const requireTrust = (what) => {
        if (vscode.workspace.isTrusted) {
            return true;
        }
        vscode.window.showWarningMessage(`FCC: ${what} is disabled in untrusted workspaces.`);
        return false;
    };
    const agentCwd = async () => {
        const mode = cfg().get('agents.workingDirectory', 'workspace');
        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        switch (mode) {
            case 'activeFile': {
                const f = vscode.window.activeTextEditor?.document.uri;
                return f && f.scheme === 'file' ? path.dirname(f.fsPath) : ws ?? os.homedir();
            }
            case 'home':
                return os.homedir();
            case 'prompt': {
                const v = await vscode.window.showInputBox({ prompt: 'Working directory for the agent', value: ws ?? os.homedir(), ignoreFocusOut: true });
                return v || undefined;
            }
            default:
                return ws ?? os.homedir();
        }
    };
    const terminalLocation = () => cfg().get('agents.terminalLocation', 'panel') === 'editor'
        ? { viewColumn: vscode.ViewColumn.Active }
        : undefined;
    const launchAgent = async (agent) => {
        if (!requireTrust('launching coding agents')) {
            return;
        }
        const cwd = await agentCwd();
        if (!cwd) {
            return;
        }
        const overrides = cfg().get('agents.commands', {});
        const extra = cfg().get('agents.extraArgs', {})[agent.id] ?? [];
        const command = [overrides[agent.id] || agent.command, ...extra].join(' ');
        if (!(await (0, util_1.commandExists)(overrides[agent.id] || agent.command))) {
            const pick = await vscode.window.showWarningMessage(`\`${agent.command}\` was not found on PATH. Install FCC (and select ${agent.label} in the installer), or override the command in the fcc.agents.commands setting.`, 'Install FCC', 'Open Settings', 'Launch anyway');
            if (pick === 'Install FCC') {
                void vscode.commands.executeCommand('fcc.install');
                return;
            }
            if (pick === 'Open Settings') {
                void vscode.commands.executeCommand('fcc.openSettings');
                return;
            }
            if (pick !== 'Launch anyway') {
                return;
            }
        }
        const term = vscode.window.createTerminal({ name: `FCC: ${agent.label}`, cwd, location: terminalLocation() });
        term.show();
        term.sendText(command); // FCC launchers start the server automatically
        void vscode.commands.executeCommand('setContext', 'fcc.lastAgent', agent.id);
    };
    const pickAgent = async () => {
        const sel = await vscode.window.showQuickPick(catalog_1.AGENTS.map((a) => ({ label: `$(rocket) ${a.label}`, description: a.command, detail: a.description, agent: a })), { placeHolder: 'Launch a coding agent through FCC', matchOnDescription: true });
        return sel?.agent;
    };
    const openGuide = async (key) => {
        const content = guides_1.GUIDES[key];
        if (!content) {
            return;
        }
        const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content });
        try {
            await vscode.commands.executeCommand('markdown.showPreview', doc.uri);
        }
        catch {
            await vscode.window.showTextDocument(doc);
        }
    };
    const openAdmin = async () => {
        if (server.state === 'stopped') {
            const c = await vscode.window.showWarningMessage('The FCC server does not appear to be running.', 'Start Server', 'Open Anyway');
            if (c === 'Start Server') {
                if (!(await server.startServer())) {
                    return;
                }
            }
            else if (c !== 'Open Anyway') {
                return;
            }
        }
        if (cfg().get('adminUi.openIn', 'externalBrowser') === 'simpleBrowser') {
            await vscode.commands.executeCommand('simpleBrowser.show', server.adminUrl);
        }
        else {
            await open(server.adminUrl);
        }
    };
    const resolveProvider = async (arg) => {
        let id;
        if (typeof arg === 'string') {
            id = arg;
        }
        else if (arg && typeof arg === 'object') {
            const node = arg;
            id = node.id?.startsWith('provider.') ? node.id.slice('provider.'.length) : node.command?.arguments?.[0];
        }
        if (id) {
            return catalog_1.PROVIDERS.find((p) => p.id === id);
        }
        const sel = await vscode.window.showQuickPick(catalog_1.PROVIDERS.map((p) => ({ label: p.name, description: p.example, detail: p.env.length ? p.env.map((e) => e.name).join(' + ') : 'Connect in Admin UI', p })), { placeHolder: `Search ${catalog_1.PROVIDERS.length} FCC providers`, matchOnDescription: true, matchOnDetail: true });
        return sel?.p;
    };
    const storeCredential = async (p) => {
        if (p.kind === 'oauth' || p.env.length === 0) {
            const c = await vscode.window.showInformationMessage(`${p.name} is connected from the Admin UI. ${p.note ?? ''}`, 'Open Admin UI');
            if (c) {
                await openAdmin();
            }
            return;
        }
        let stored = 0;
        for (const v of p.env) {
            const existing = v.secret ? await ctx.secrets.get((0, server_1.credentialKey)(v.name)) : ctx.globalState.get((0, server_1.credentialKey)(v.name));
            const input = await vscode.window.showInputBox({
                title: `${p.name}: ${v.name}`,
                prompt: v.prompt ?? (v.secret ? `Paste your ${v.name}${v.optional ? ' (optional, leave empty to skip)' : ''}` : v.name),
                password: v.secret,
                value: v.secret ? '' : existing ?? v.defaultValue ?? '',
                placeHolder: v.secret && existing ? 'A value is already stored. Leave empty to keep it.' : undefined,
                ignoreFocusOut: true,
            });
            if (input === undefined) {
                return;
            }
            if (!input.trim()) {
                continue;
            }
            if (v.secret) {
                await ctx.secrets.store((0, server_1.credentialKey)(v.name), input.trim());
            }
            else {
                await ctx.globalState.update((0, server_1.credentialKey)(v.name), input.trim());
            }
            stored++;
        }
        await providersTree.detect();
        if (stored > 0) {
            const c = await vscode.window.showInformationMessage(`${p.name}: saved in VS Code Secret Storage. It is passed to the server when FCC is started from VS Code (restart needed). Values saved in the Admin UI may take precedence.`, server.startedHere ? 'Restart Server' : 'OK', 'Open Admin UI');
            if (c === 'Restart Server') {
                void server.restart();
            }
            else if (c === 'Open Admin UI') {
                void openAdmin();
            }
        }
    };
    const providerActions = async (p) => {
        const items = [
            { label: '$(key) Store credential securely…', description: p.env.length ? p.env.map((e) => e.name).join(' + ') : 'not applicable', run: () => storeCredential(p) },
            { label: '$(link-external) Open key / docs page', description: p.url, run: () => void open(p.url) },
            { label: '$(copy) Copy example MODEL', description: p.example, run: async () => { await vscode.env.clipboard.writeText(p.example); vscode.window.showInformationMessage(`Copied ${p.example}`); } },
            { label: '$(settings-gear) Open Admin UI to select a model', run: () => openAdmin() },
            { label: '$(trash) Remove stored credential…', run: () => clearCredential(p) },
        ];
        if (p.note) {
            items.splice(1, 0, { label: '$(info) Setup notes', detail: p.note, run: () => void vscode.window.showInformationMessage(`${p.name}: ${p.note}`, { modal: true }) });
        }
        const sel = await vscode.window.showQuickPick(items, { title: `${p.name}  (${p.id}/)`, placeHolder: 'Choose an action' });
        await sel?.run();
    };
    const clearCredential = async (p) => {
        for (const v of p.env) {
            await ctx.secrets.delete((0, server_1.credentialKey)(v.name));
            await ctx.globalState.update((0, server_1.credentialKey)(v.name), undefined);
        }
        await providersTree.detect();
        vscode.window.showInformationMessage(`Removed credentials stored by this extension for ${p.name}.`);
    };
    const claudeCodeEnv = async () => {
        const vars = [{ name: 'ANTHROPIC_BASE_URL', value: server.baseUrl }];
        const token = await server.getToken();
        if (token) {
            vars.push({ name: 'ANTHROPIC_AUTH_TOKEN', value: token });
        }
        return vars;
    };
    const scriptUrl = (name) => `${catalog_1.RAW_BASE}/${name}`;
    const runInstaller = async (kind) => {
        if (!requireTrust('running installers')) {
            return;
        }
        const voice = cfg().get('install.voiceLocal', false);
        const torch = cfg().get('install.torchBackend', '');
        const names = { install: 'install', uninstall: 'uninstall', 'muse-install': 'install-muse', 'muse-uninstall': 'uninstall-muse' };
        if ((kind === 'muse-install' || kind === 'muse-uninstall') && !util_1.isWindows) {
            vscode.window.showInformationMessage('Muse Code scripts are only for native Windows. On macOS/Linux Muse Code is handled by the main installer.');
            return;
        }
        const base = names[kind];
        const url = scriptUrl(util_1.isWindows ? `${base}.ps1` : `${base}.sh`);
        const detail = kind === 'uninstall'
            ? 'Removes Free Claude Code, its desktop launcher/commands and ~/.fcc/ (your settings). Keeps uv, Python, your coding agents, RTK and Headroom. Stop every running FCC command and quit connected desktop/editor apps first.'
            : `Downloads and runs the official script from the FCC repository: ${url}\n\nReview it before running if you want to.`;
        const choice = await vscode.window.showWarningMessage(kind === 'uninstall' ? 'Uninstall Free Claude Code?' : 'Run the FCC script in a terminal?', { modal: true, detail }, kind === 'uninstall' ? 'Uninstall' : 'Run', 'Open Script');
        if (choice === 'Open Script') {
            void open(url);
            return;
        }
        if (!choice) {
            return;
        }
        let command;
        if (util_1.isWindows) {
            const flags = kind === 'install' ? [voice ? '-VoiceLocal' : '', voice && torch ? `-TorchBackend ${torch}` : ''].filter(Boolean).join(' ') : '';
            command = `& ([scriptblock]::Create((irm "${url}")))${flags ? ' ' + flags : ''}`;
        }
        else {
            const flags = kind === 'install' ? [voice ? '--voice-local' : '', voice && torch ? `--torch-backend ${torch}` : ''].filter(Boolean).join(' ') : '';
            command = `curl -fsSL "${url}" | sh${flags ? ' -s -- ' + flags : ''}`;
        }
        const term = util_1.isWindows
            ? vscode.window.createTerminal({ name: `FCC: ${kind}`, shellPath: 'powershell.exe', shellArgs: ['-NoProfile', '-ExecutionPolicy', 'Bypass'] })
            : vscode.window.createTerminal({ name: `FCC: ${kind}` });
        term.show();
        term.sendText(command);
        vscode.window.showInformationMessage(kind === 'uninstall'
            ? 'FCC uninstaller started in the terminal.'
            : 'Installer started in the terminal. When it finishes, run "FCC: Refresh All Views" or reload the window.');
    };
    // ---------- commands ----------
    const reg = (id, fn) => ctx.subscriptions.push(vscode.commands.registerCommand(id, fn));
    reg('fcc.menu', async () => {
        const items = [];
        if (server.state === 'stopped') {
            items.push({ label: '$(play) Start Server', cmd: 'fcc.server.start' });
        }
        else {
            items.push({ label: '$(debug-restart) Restart Server', cmd: 'fcc.server.restart' });
            if (server.startedHere) {
                items.push({ label: '$(debug-stop) Stop Server', cmd: 'fcc.server.stop' });
            }
        }
        items.push({ label: '$(settings-gear) Open Admin UI', description: server.adminUrl, cmd: 'fcc.server.openAdmin' }, { label: '$(rocket) Launch Coding Agent…', cmd: 'fcc.agent.pick' }, { label: '$(search) Browse Models…', cmd: 'fcc.models.pick' }, { label: '$(key) Search Providers / Store Key…', cmd: 'fcc.provider.search' }, { label: '$(lock) Set Proxy Auth Token…', cmd: 'fcc.token.set' }, { label: '$(plug) Point Claude Code for VS Code at FCC', cmd: 'fcc.claudeCode.configure' }, { label: '$(output) Show Logs', cmd: 'fcc.server.showLogs' }, { label: '$(heart) Run Diagnostics', cmd: 'fcc.doctor' }, { label: '$(sync) Update FCC', cmd: 'fcc.update' }, { label: '$(gear) Extension Settings', cmd: 'fcc.openSettings' });
        const sel = await vscode.window.showQuickPick(items, { placeHolder: 'Free Claude Code' });
        if (sel) {
            void vscode.commands.executeCommand(sel.cmd);
        }
    });
    reg('fcc.refresh', async () => {
        await server.poll();
        void server.refreshVersion();
        await agentsTree.detect();
        await providersTree.detect();
        refreshAll();
        const found = await (0, util_1.commandExists)(cfg().get('server.command', 'fcc-server'));
        void vscode.commands.executeCommand('setContext', 'fcc.cliFound', found);
    });
    // server
    reg('fcc.server.start', () => server.startServer());
    reg('fcc.server.stop', () => server.stopServer());
    reg('fcc.server.restart', () => server.restart());
    reg('fcc.server.openAdmin', openAdmin);
    reg('fcc.server.showLogs', () => server.output.show());
    reg('fcc.server.checkHealth', async () => {
        const r = await server.probe();
        await server.poll();
        if (!r.up) {
            vscode.window.showErrorMessage(`FCC is not reachable at ${server.baseUrl}.`, 'Start Server').then((c) => c && vscode.commands.executeCommand('fcc.server.start'));
        }
        else if (r.auth) {
            vscode.window.showWarningMessage(`FCC is up at ${server.baseUrl} but requires a proxy token.`, 'Set Token').then((c) => c && vscode.commands.executeCommand('fcc.token.set'));
        }
        else {
            vscode.window.showInformationMessage(`FCC is healthy at ${server.baseUrl} — ${r.models.length} model(s) exposed.`);
        }
    });
    reg('fcc.server.copyUrl', async () => {
        await vscode.env.clipboard.writeText(server.baseUrl);
        vscode.window.showInformationMessage(`Copied ${server.baseUrl}`);
    });
    reg('fcc.server.startDesktop', () => {
        if (!requireTrust('starting the desktop launcher')) {
            return;
        }
        const term = vscode.window.createTerminal({ name: 'FCC Desktop' });
        term.sendText('fcc-desktop');
        term.show();
    });
    reg('fcc.server.copyEnv', async () => {
        const vars = await claudeCodeEnv();
        const fmt = await vscode.window.showQuickPick(['bash / zsh (export)', 'PowerShell ($env:)', 'cmd (set)', 'Claude Code VS Code JSON (claudeCode.environmentVariables)', '.env file'], { placeHolder: 'Format' });
        if (!fmt) {
            return;
        }
        let text;
        if (fmt.startsWith('bash')) {
            text = vars.map((v) => `export ${v.name}="${v.value}"`).join('\n');
        }
        else if (fmt.startsWith('PowerShell')) {
            text = vars.map((v) => `$env:${v.name}="${v.value}"`).join('\n');
        }
        else if (fmt.startsWith('cmd')) {
            text = vars.map((v) => `set ${v.name}=${v.value}`).join('\n');
        }
        else if (fmt.startsWith('Claude')) {
            text = JSON.stringify(vars, null, 2);
        }
        else {
            text = vars.map((v) => `${v.name}=${v.value}`).join('\n');
        }
        await vscode.env.clipboard.writeText(text);
        vscode.window.showInformationMessage('Copied. Note: the base URL is the server root, not the /admin page.');
    });
    reg('fcc.terminal.withEnv', async () => {
        if (!requireTrust('opening terminals with the FCC environment')) {
            return;
        }
        const env = { ANTHROPIC_BASE_URL: server.baseUrl };
        const t = await server.getToken();
        if (t) {
            env.ANTHROPIC_AUTH_TOKEN = t;
        }
        vscode.window.createTerminal({ name: 'FCC env', env }).show();
    });
    // agents
    reg('fcc.agent.pick', async () => {
        const a = await pickAgent();
        if (a) {
            await launchAgent(a);
        }
    });
    reg('fcc.agent.launch', async (arg) => {
        let id;
        if (typeof arg === 'string') {
            id = arg;
        }
        else if (arg && typeof arg === 'object') {
            const n = arg;
            id = n.id?.startsWith('agent.') ? n.id.slice(6) : n.command?.arguments?.[0];
        }
        const agent = catalog_1.AGENTS.find((a) => a.id === id) ?? (await pickAgent());
        if (agent) {
            await launchAgent(agent);
        }
    });
    for (const a of catalog_1.AGENTS) {
        reg(`fcc.agent.${a.id}`, () => launchAgent(a));
    }
    // models
    reg('fcc.models.refresh', async () => {
        await server.poll();
        modelsTree.refresh();
    });
    reg('fcc.models.pick', async () => {
        await server.poll();
        if (server.models.length === 0) {
            vscode.window.showInformationMessage(server.state === 'running' ? 'FCC exposes no models (is a provider configured?).' : 'Start the FCC server first.');
            return;
        }
        const sel = await vscode.window.showQuickPick(server.models.map((m) => ({ label: m.name ?? m.id, description: m.name ? m.id : undefined, id: m.id })), { placeHolder: `${server.models.length} models exposed by FCC (select to copy ID)`, matchOnDescription: true });
        if (sel) {
            await vscode.env.clipboard.writeText(sel.id);
            vscode.window.showInformationMessage(`Copied ${sel.id}`);
        }
    });
    reg('fcc.models.copy', async (arg) => {
        const id = typeof arg === 'string' ? arg : arg?.command?.arguments?.[0];
        if (id) {
            await vscode.env.clipboard.writeText(id);
            vscode.window.showInformationMessage(`Copied ${id}`);
        }
    });
    const setEnvOverride = async (envName, value) => {
        const conf = cfg();
        const current = { ...(conf.get('server.env', {})) };
        if (value === undefined) {
            delete current[envName];
        }
        else {
            current[envName] = value;
        }
        await conf.update('server.env', current, vscode.ConfigurationTarget.Global);
        const c = await vscode.window.showInformationMessage(`${envName} ${value === undefined ? 'override removed' : `set to ${value}`} (applies when FCC is started from VS Code; the Admin UI selection may take precedence).`, server.startedHere ? 'Restart Server' : 'OK', 'Open Admin UI');
        if (c === 'Restart Server') {
            void server.restart();
        }
        else if (c === 'Open Admin UI') {
            void openAdmin();
        }
    };
    const chooseModel = async (title, allowNone) => {
        const items = server.models.map((m) => ({ label: m.name ?? m.id, description: m.name ? m.id : undefined, value: m.id }));
        items.unshift({ label: '$(edit) Enter a model manually…', description: '<provider-id>/<exact-provider-model-id>', special: 'manual' });
        if (allowNone) {
            items.unshift({ label: '$(circle-slash) None (use MODEL)', special: 'none' });
        }
        const sel = await vscode.window.showQuickPick(items, { title, matchOnDescription: true });
        if (!sel) {
            return undefined;
        }
        if (sel.special === 'none') {
            return null;
        }
        if (sel.special === 'manual') {
            const v = await vscode.window.showInputBox({ prompt: 'Model, e.g. nvidia_nim/nvidia/nemotron-3-super-120b-a12b', ignoreFocusOut: true, validateInput: (s) => (s.includes('/') || !s ? undefined : 'Expected <provider-id>/<model-id>') });
            return v ? v.trim() : undefined;
        }
        return sel.value;
    };
    reg('fcc.model.set', async () => {
        const m = await chooseModel('Set MODEL (fallback for every request)', false);
        if (m) {
            await setEnvOverride('MODEL', m);
        }
    });
    reg('fcc.model.setTier', async (arg) => {
        let envName = typeof arg === 'string' ? arg : undefined;
        if (!envName) {
            const t = await vscode.window.showQuickPick(catalog_1.MODEL_TIERS.map((x) => ({ label: x.label, description: x.env, env: x.env })), { placeHolder: 'Claude Code tier' });
            envName = t?.env;
        }
        if (!envName) {
            return;
        }
        const m = await chooseModel(`Set ${envName}`, true);
        if (m === undefined) {
            return;
        }
        await setEnvOverride(envName, m === null ? undefined : m);
    });
    // providers
    reg('fcc.provider.search', async () => {
        const p = await resolveProvider(undefined);
        if (p) {
            await providerActions(p);
        }
    });
    reg('fcc.provider.pick', async (arg) => {
        const p = await resolveProvider(arg);
        if (p) {
            await providerActions(p);
        }
    });
    reg('fcc.provider.setCredential', async (arg) => {
        const p = await resolveProvider(arg);
        if (p) {
            await storeCredential(p);
        }
    });
    reg('fcc.provider.clearCredential', async (arg) => {
        const p = await resolveProvider(arg);
        if (p) {
            await clearCredential(p);
        }
    });
    reg('fcc.provider.openKeyPage', async (arg) => {
        const p = await resolveProvider(arg);
        if (p) {
            await open(p.url);
        }
    });
    reg('fcc.provider.copyModel', async (arg) => {
        const p = await resolveProvider(arg);
        if (p) {
            await vscode.env.clipboard.writeText(p.example);
            vscode.window.showInformationMessage(`Copied ${p.example}`);
        }
    });
    reg('fcc.secrets.clearAll', async () => {
        const c = await vscode.window.showWarningMessage('Remove all provider credentials and the proxy token stored by this extension?', { modal: true }, 'Remove');
        if (c !== 'Remove') {
            return;
        }
        for (const p of catalog_1.PROVIDERS) {
            for (const v of p.env) {
                await ctx.secrets.delete((0, server_1.credentialKey)(v.name));
                await ctx.globalState.update((0, server_1.credentialKey)(v.name), undefined);
            }
        }
        await server.clearToken();
        await providersTree.detect();
        vscode.window.showInformationMessage('All stored credentials removed.');
    });
    // proxy token
    reg('fcc.token.set', async () => {
        const t = await vscode.window.showInputBox({
            title: 'FCC proxy auth token',
            prompt: 'Must match the token configured in Admin UI (Proxy Authentication / API/CLI Auth Token). Stored in VS Code Secret Storage.',
            password: true,
            ignoreFocusOut: true,
        });
        if (t?.trim()) {
            await server.setToken(t.trim());
            await server.poll();
            await applyTerminalEnv();
            vscode.window.showInformationMessage('FCC proxy token saved.');
        }
    });
    reg('fcc.token.generate', async () => {
        const token = `fcc-${crypto.randomBytes(24).toString('hex')}`;
        await server.setToken(token);
        await applyTerminalEnv();
        const c = await vscode.window.showInformationMessage('Generated a random proxy token and stored it. Enter the same value in Admin UI → Proxy Authentication, or enable fcc.auth.injectIntoServer.', 'Copy Token', 'Open Admin UI');
        if (c === 'Copy Token') {
            await vscode.env.clipboard.writeText(token);
        }
        else if (c === 'Open Admin UI') {
            void openAdmin();
        }
    });
    reg('fcc.token.clear', async () => {
        await server.clearToken();
        await applyTerminalEnv();
        vscode.window.showInformationMessage('Stored proxy token removed.');
    });
    // integrations
    const integrationFrom = (arg) => {
        let id;
        if (typeof arg === 'string') {
            id = arg;
        }
        else if (arg && typeof arg === 'object') {
            const n = arg;
            id = n.id?.startsWith('integration.') ? n.id.slice('integration.'.length) : n.command?.arguments?.[0];
        }
        return catalog_1.INTEGRATIONS.find((i) => i.id === id);
    };
    reg('fcc.integration.connect', async (arg) => {
        let integ = integrationFrom(arg);
        if (!integ) {
            const sel = await vscode.window.showQuickPick(catalog_1.INTEGRATIONS.map((i) => ({ label: i.label, description: i.description, i })), { placeHolder: 'Integration' });
            integ = sel?.i;
        }
        if (!integ) {
            return;
        }
        const buttons = ['Open Admin UI → Integrations'];
        const missing = integ.extensionId && !vscode.extensions.getExtension(integ.extensionId);
        if (missing) {
            buttons.unshift('Install Extension');
        }
        if (integ.id === 'claude-code-vscode') {
            buttons.push('Configure Settings Automatically');
        }
        const c = await vscode.window.showInformationMessage(`${integ.label}\n\n${integ.steps}`, { modal: true }, ...buttons);
        if (c === 'Install Extension') {
            await vscode.commands.executeCommand('fcc.integration.installExtension', integ.id);
        }
        else if (c === 'Open Admin UI → Integrations') {
            await openAdmin();
        }
        else if (c === 'Configure Settings Automatically') {
            await vscode.commands.executeCommand('fcc.claudeCode.configure');
        }
    });
    reg('fcc.integration.installExtension', async (arg) => {
        const integ = integrationFrom(arg);
        if (integ?.extensionId) {
            await vscode.commands.executeCommand('workbench.extensions.installExtension', integ.extensionId);
        }
    });
    const claudeCodeTarget = () => cfg().get('claudeCode.settingsScope', 'user') === 'workspace' && vscode.workspace.workspaceFolders
        ? vscode.ConfigurationTarget.Workspace
        : vscode.ConfigurationTarget.Global;
    reg('fcc.claudeCode.configure', async () => {
        let token = await server.getToken();
        if (!token) {
            const c = await vscode.window.showInformationMessage('No proxy token is stored. Claude Code for VS Code may ask you to sign in without ANTHROPIC_AUTH_TOKEN. Generate one now?', 'Generate Token', 'Enter Token', 'Skip');
            if (c === 'Generate Token') {
                await vscode.commands.executeCommand('fcc.token.generate');
            }
            else if (c === 'Enter Token') {
                await vscode.commands.executeCommand('fcc.token.set');
            }
            token = await server.getToken();
        }
        const target = claudeCodeTarget();
        const conf = vscode.workspace.getConfiguration('claudeCode');
        const inspected = conf.inspect('environmentVariables');
        const existing = (target === vscode.ConfigurationTarget.Workspace ? inspected?.workspaceValue : inspected?.globalValue) ?? [];
        const next = existing.filter((e) => e.name !== 'ANTHROPIC_BASE_URL' && e.name !== 'ANTHROPIC_AUTH_TOKEN');
        next.push(...(await claudeCodeEnv()));
        try {
            await conf.update('environmentVariables', next, target);
        }
        catch (e) {
            vscode.window.showErrorMessage(`Could not write claudeCode.environmentVariables (is the Claude Code extension installed?): ${String(e)}`);
            return;
        }
        try {
            await conf.update('disableLoginPrompt', true, target);
        }
        catch {
            /* setting only exists in some Claude Code extension versions */
        }
        const c = await vscode.window.showInformationMessage(`Claude Code for VS Code now points at ${server.baseUrl}. Reload the window to apply. ${token ? 'Make sure the same token is set in the FCC Admin UI.' : ''}`, 'Reload Window');
        if (c) {
            void vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    });
    reg('fcc.claudeCode.unconfigure', async () => {
        const target = claudeCodeTarget();
        const conf = vscode.workspace.getConfiguration('claudeCode');
        const inspected = conf.inspect('environmentVariables');
        const existing = (target === vscode.ConfigurationTarget.Workspace ? inspected?.workspaceValue : inspected?.globalValue) ?? [];
        const next = existing.filter((e) => e.name !== 'ANTHROPIC_BASE_URL' && e.name !== 'ANTHROPIC_AUTH_TOKEN');
        try {
            await conf.update('environmentVariables', next.length ? next : undefined, target);
            vscode.window.showInformationMessage('Removed FCC variables from Claude Code settings. Reload the window to apply.', 'Reload Window').then((c) => c && vscode.commands.executeCommand('workbench.action.reloadWindow'));
        }
        catch (e) {
            vscode.window.showErrorMessage(`Could not update claudeCode settings: ${String(e)}`);
        }
    });
    // messaging / voice / guides
    reg('fcc.messaging.guide', async (which) => {
        let key = which;
        if (key !== 'discord' && key !== 'telegram') {
            const sel = await vscode.window.showQuickPick([{ label: 'Discord', key: 'discord' }, { label: 'Telegram', key: 'telegram' }], { placeHolder: 'Messaging platform' });
            key = sel?.key;
        }
        if (key) {
            await openGuide(key);
        }
    });
    reg('fcc.messaging.commands', () => openGuide('commands'));
    reg('fcc.voice.guide', () => openGuide('voice'));
    reg('fcc.voice.installLocal', async () => {
        const conf = cfg();
        await conf.update('install.voiceLocal', true, vscode.ConfigurationTarget.Global);
        const torch = await vscode.window.showQuickPick([{ label: 'CPU or default CUDA build', value: '' }, { label: 'CUDA 13.0 (cu130)', value: 'cu130' }], { placeHolder: 'PyTorch backend for local Whisper' });
        if (!torch) {
            return;
        }
        await conf.update('install.torchBackend', torch.value, vscode.ConfigurationTarget.Global);
        await runInstaller('install');
    });
    reg('fcc.guide.localProviders', () => openGuide('local'));
    reg('fcc.guide.routing', () => openGuide('routing'));
    reg('fcc.guide.integrations', () => openGuide('integrations'));
    reg('fcc.guide.providers', () => openGuide('providers'));
    // maintenance
    reg('fcc.install', () => runInstaller('install'));
    reg('fcc.uninstall', () => runInstaller('uninstall'));
    reg('fcc.muse.install', () => runInstaller('muse-install'));
    reg('fcc.muse.uninstall', () => runInstaller('muse-uninstall'));
    reg('fcc.update', async () => {
        if (!requireTrust('updating FCC')) {
            return;
        }
        if (cfg().get('install.voiceLocal', false)) {
            await runInstaller('install'); // README: re-run the installer with the voice option to keep local voice support
            return;
        }
        const c = await vscode.window.showWarningMessage('Update FCC with `fcc-update`?', { modal: true, detail: 'Stop all running FCC commands (server, agents) first. The updater installs the checked stable FCC release.' }, 'Update');
        if (c === 'Update') {
            const term = vscode.window.createTerminal({ name: 'FCC: update' });
            term.show();
            term.sendText('fcc-update');
        }
    });
    reg('fcc.checkForUpdates', async (silent) => {
        const current = (await server.refreshVersion()) ?? server.version;
        try {
            const res = await (0, util_1.httpRequest)(catalog_1.RELEASES_API, { Accept: 'application/vnd.github+json' }, 8000);
            const tag = JSON.parse(res.body).tag_name;
            if (!tag) {
                throw new Error(`GitHub returned ${res.status}`);
            }
            if (current && (0, util_1.compareVersions)(tag, current) > 0) {
                const c = await vscode.window.showInformationMessage(`FCC ${tag} is available (installed: ${current}).`, 'Update', 'Release Notes');
                if (c === 'Update') {
                    void vscode.commands.executeCommand('fcc.update');
                }
                else if (c === 'Release Notes') {
                    void open(`${catalog_1.REPO_URL}/releases/tag/${tag}`);
                }
            }
            else if (silent !== true) {
                vscode.window.showInformationMessage(current ? `FCC is up to date (${current}, latest ${tag}).` : `Latest FCC release is ${tag}. The installed version could not be read (is fcc-server on PATH?).`);
            }
        }
        catch (e) {
            if (silent !== true) {
                vscode.window.showWarningMessage(`Could not check for updates: ${String(e)}`);
            }
        }
    });
    reg('fcc.doctor', async () => {
        if (!requireTrust('running diagnostics')) {
            return;
        }
        const term = vscode.window.createTerminal({ name: 'FCC: doctor' });
        term.show();
        term.sendText('fcc-doctor');
        vscode.window.showInformationMessage('Paste the fcc-doctor output into your bug report.');
    });
    reg('fcc.openRepo', () => open(catalog_1.REPO_URL));
    reg('fcc.reportIssue', async () => {
        const c = await vscode.window.showInformationMessage('FCC bug reports should include every model mapping, the active model when the failure occurred, the complete error, reproducible steps, and the `fcc-doctor` output.', 'Open Issue Form', 'Run fcc-doctor');
        if (c === 'Open Issue Form') {
            void open(`${catalog_1.ISSUES_URL}/new`);
        }
        else if (c === 'Run fcc-doctor') {
            void vscode.commands.executeCommand('fcc.doctor');
        }
    });
    reg('fcc.openSettings', () => vscode.commands.executeCommand('workbench.action.openSettings', '@ext:' + EXT_FULL_ID));
    reg('fcc.walkthrough', () => vscode.commands.executeCommand('workbench.action.openWalkthrough', `${EXT_FULL_ID}#fcc.getStarted`, false));
    // ---------- startup ----------
    server.start();
    void (async () => {
        const found = await (0, util_1.commandExists)(cfg().get('server.command', 'fcc-server'));
        await vscode.commands.executeCommand('setContext', 'fcc.cliFound', found);
        await agentsTree.detect();
        await providersTree.detect();
        await applyTerminalEnv();
        await server.poll();
        void server.refreshVersion();
        renderBar();
        if (cfg().get('server.autoStart', false) && server.state === 'stopped' && found) {
            void server.startServer();
        }
        if (cfg().get('update.checkOnStartup', false)) {
            void vscode.commands.executeCommand('fcc.checkForUpdates', true);
        }
        if (!ctx.globalState.get('fcc.welcomed') && !found) {
            await ctx.globalState.update('fcc.welcomed', true);
            void vscode.commands.executeCommand('fcc.walkthrough');
        }
    })();
}
function deactivate() {
    /* ServerManager.dispose runs via subscriptions */
}
//# sourceMappingURL=extension.js.map