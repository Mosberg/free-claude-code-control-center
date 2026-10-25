# Free Claude Code (FCC) Control Center for VS Code

> **Unofficial.** Independent companion extension for [Alishahryar1/free-claude-code](https://github.com/Alishahryar1/free-claude-code) (AGPL-3.0). Not affiliated with or endorsed by the FCC project or Anthropic. Claude and Claude Code are trademarks of Anthropic.

FCC is a local proxy that lets coding agents use free, paid, subscription and local models. This extension puts FCC's server, agents, providers, models, integrations and maintenance commands inside VS Code.

## What it does

| Area | Features |
| --- | --- |
| **Server** | Start / stop / restart `fcc-server` (background process with logs, or in a terminal), auto-detects the port from the startup log, health polling via `GET /v1/models`, proxy-token aware, status bar item, optional auto-start, `fcc-desktop` launcher |
| **Admin UI** | One click to open `/admin` externally or in VS Code's Simple Browser |
| **Agents (10)** | Launch `fcc-claude`, `fcc-codex`, `fcc-pi`, `fcc-opencode`, `fcc-cline`, `fcc-hermes`, `fcc-dsh`, `fcc-grok`, `fcc-muse`, `fcc-aider` in a terminal in your workspace; PATH detection, per-agent command overrides and extra args |
| **Providers (61)** | Searchable catalog with env var names, example `MODEL` values, key pages and setup notes (OAuth, ADC, Azure, Bedrock, Cloudflare, Vertex, local servers…). Store keys in VS Code Secret Storage; they are passed to the server when it is started from VS Code |
| **Models** | Live list of the models FCC exposes, copy IDs, launch-time overrides for `MODEL` and `MODEL_FABLE` / `MODEL_OPUS` / `MODEL_SONNET` / `MODEL_HAIKU` |
| **Routing guide** | Fallback models, numbered API keys, reasoning levels (Inherit / Off / From client / Low / Medium / High / X-High / Max), custom providers |
| **Integrations** | Claude Code for VS Code (writes `claudeCode.environmentVariables`), VS Code Chat, Codex in VS Code / App, Claude Desktop, DeepSeek Harness Desktop, JetBrains ACP, Claude Code onboarding; extension detection and install buttons |
| **Messaging & voice** | Discord and Telegram setup guides, `/stats` `/stop` `/clear` reference, NVIDIA NIM and local Whisper voice guides, one-click local Whisper install (`--voice-local`, `--torch-backend cu130`) |
| **Maintenance** | Install, `fcc-update`, update check against GitHub Releases, `fcc-doctor`, uninstall, Muse Code install/remove (Windows), bug-report helper, getting-started walkthrough |
| **Security** | Credentials and the proxy token live in Secret Storage; installers and launchers are disabled in untrusted workspaces; remote scripts always require a confirmation dialog with a "view script" option |

## Important: what is and isn't configurable from here

FCC stores its authoritative configuration (provider keys, `MODEL`, fallbacks, reasoning effort, messaging, voice, proxy authentication, integrations) through its **Admin UI**, which the extension opens for you. FCC's Admin UI HTTP API is not documented, so this extension does **not** try to edit those settings behind your back.

What it does instead:

- Launch-time environment overrides (`fcc.server.env`, stored provider credentials, the *Set MODEL* / *Set tier* commands) are passed to `fcc-server` **only when the extension starts it**. If the Admin UI has saved a different value it may take precedence.
- It reads `PORT`, `HOST` and `ANTHROPIC_AUTH_TOKEN` best-effort from `~/.fcc/.env` or `~/.config/free-claude-code/.env` if they exist.
- Anything that needs the Admin UI (OAuth connects, fallback lists, per-model reasoning, messaging, voice, Connect buttons) is guided step by step with a button that opens it.

## Requirements

- VS Code 1.85+
- FCC installed (the extension can run the official installer for you). Python/uv are installed by the FCC installer.

## Settings

All settings are under **Free Claude Code** (`fcc.*`): `server.command`, `server.cwd`, `server.extraArgs`, `server.runIn`, `server.host`, `server.port`, `server.readFccEnvFile`, `server.autoStart`, `server.stopOnExit`, `server.startTimeoutSeconds`, `server.healthCheckIntervalSeconds`, `server.env`, `auth.injectIntoServer`, `adminUi.path`, `adminUi.openIn`, `agents.commands`, `agents.extraArgs`, `agents.workingDirectory`, `agents.terminalLocation`, `terminal.injectEnv`, `claudeCode.settingsScope`, `statusBar.enabled`, `statusBar.alignment`, `install.voiceLocal`, `install.torchBackend`, `update.checkOnStartup`.

Running FCC from a source checkout? Set `fcc.server.command` to `uv run fcc-server` and `fcc.server.cwd` to the checkout, and override launchers with `fcc.agents.commands`, e.g. `{ "claude": "uv run fcc-claude" }`.

## Commands

Every command is under the **FCC:** category in the Command Palette (about 60), including: Start/Stop/Restart Server, Open Admin UI, Show Logs, Check Health, Copy Environment Snippet, Open Terminal with FCC Environment, Launch Coding Agent (+ one per agent), Browse Models, Set MODEL / Tier, Search Providers, Store/Remove Provider Credential, Set/Generate/Clear Proxy Token, Connect Integration, Point Claude Code for VS Code at FCC, guides, Install/Update/Uninstall, Run Diagnostics, Report a Bug.

## Build from source

```bash
npm install
npm run compile
npm run package        # produces free-claude-code-control-center-0.1.0.vsix
code --install-extension free-claude-code-control-center-0.1.0.vsix
```

## Notes on accuracy

Feature details come from the FCC README and `pyproject.toml` (checked 24 Oct 2026). FCC moves fast: provider IDs, example models and installer flags can change, and the provider catalog in `src/catalog.ts` is the one place to update.

## License

MIT for this extension. FCC itself is AGPL-3.0-only.
