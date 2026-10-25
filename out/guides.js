"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GUIDES = void 0;
const catalog_1 = require("./catalog");
exports.GUIDES = {
    discord: `# FCC Discord bot

Configure from **Admin UI → Messaging**, then click **Apply**.

1. Create a bot in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Enable **Message Content Intent** and invite it with read, send, message-history and **Manage Messages** permissions so \`/clear\` can remove user prompts.
3. Set **Messaging Platform** to **discord**.
4. Enter **Discord Bot Token**, **Allowed Discord Channels** and an absolute **Allowed Directory**.
5. Apply the settings and restart the server if requested.

Commands: see "FCC: Show Messaging Commands".
`,
    telegram: `# FCC Telegram bot

Configure from **Admin UI → Messaging**, then click **Apply**.

1. Create a bot with [@BotFather](https://t.me/BotFather).
2. Get your numeric user ID from [@userinfobot](https://t.me/userinfobot). In groups, grant the bot permission to delete messages.
3. Set **Messaging Platform** to **telegram**.
4. Enter **Telegram Bot Token**, **Allowed Telegram User ID** and an absolute **Allowed Directory**.
5. Apply the settings and restart the server if requested.

Commands: see "FCC: Show Messaging Commands".
`,
    commands: `# FCC messaging commands

| Usage | Behavior |
| --- | --- |
| \`/stats\` | Show session state. |
| Standalone \`/stop\` | Cancel all work. |
| Reply with \`/stop\` | Cancel only the selected request while other queued requests continue. |
| Standalone \`/clear\` | Clear all FCC conversations and their messages in this chat. |
| Reply with \`/clear\` | Delete the selected message and the chain of replies to it. Keep other conversations. |
`,
    voice: `# FCC voice notes

Talk to your agent through Discord/Telegram using local Whisper or NVIDIA NIM transcription.

## NVIDIA NIM (included in every installation)
In **Admin UI → Messaging → Voice**, enable voice notes, select \`nvidia_nim\` and choose a supported model. Configure your NVIDIA NIM API key on the Providers page.

## Local Whisper (CPU or CUDA)
Run **FCC: Install Local Whisper Voice Support…** (re-runs the installer with \`--voice-local\` / \`-VoiceLocal\`; add the CUDA 13.0 torch backend with the \`fcc.install.torchBackend\` setting set to \`cu130\`). Then restart \`fcc-server\`. In **Admin UI → Messaging → Voice**, enable voice notes, select \`cpu\` or \`cuda\` and choose the Whisper model. Local gated models need \`HUGGINGFACE_API_KEY\`.
`,
    local: `# Local providers (LM Studio, llama.cpp, Ollama)

FCC automatically discovers models from running local servers at startup. If you start a server later, click **Refresh models** in the Admin UI.

## LM Studio
Start LM Studio's local server, load a tool-capable model, and use the identifier shown by LM Studio with the \`lmstudio/\` prefix. Default URL: \`http://localhost:1234/v1\` (\`LM_STUDIO_BASE_URL\`).

## llama.cpp
Start \`llama-server\` with its OpenAI-compatible Chat Completions API and enough context for the model. Use the model ID with the \`llamacpp/\` prefix. \`LLAMACPP_BASE_URL\` defaults to \`http://localhost:8080/v1\`.

## Ollama
\`\`\`
ollama pull llama3.1
ollama serve
\`\`\`
Use the tag from \`ollama list\` with the \`ollama/\` prefix. \`OLLAMA_BASE_URL\` defaults to \`http://localhost:11434\`.

Provider cards in the Admin UI show the checked endpoint and response time. After starting a server or fixing its settings, click **Test**.

Prefer tool-capable models for coding agents. Local models also need enough context for the agent's system prompt and tool definitions.
`,
    routing: `# Model routing, fallbacks and reasoning

## MODEL and tier routing
\`MODEL\` is the fallback for every request (format \`<provider-id>/<exact-provider-model-id>\`). Select a model for ${catalog_1.MODEL_TIERS.map((t) => '`' + t.env + '`').join(', ')} to override an individual Claude Code tier. Select **None** to use \`MODEL\`.

## Fallback models
In **Admin UI → Model Config**, add **Fallback Models** in the order FCC should try them if the selected model fails. After retries are exhausted FCC automatically tries the next configured model without restarting the turn. This works across every client. A failed request may reach and consume usage from more than one provider before succeeding.

Choose a model, effort and API key number in the bottom row, then click **+**. Edit in place, drag the handle to reorder, or click the red trash button to remove.

## Numbered API keys
Provider modals support numbered keys (**Add key**, remove, drag to reorder). FCC uses key 1. A fallback can select the same model with another key number.

## Reasoning control
**Admin UI → Model Config → Model Routing**. Levels: ${catalog_1.REASONING_LEVELS.map((l) => '**' + l + '**').join(', ')}.

| Selection | Behavior |
| --- | --- |
| **From client** | Use the effort sent by your coding agent. If none is sent, keep the provider default. |
| **Off** | Request reasoning to be disabled. |
| **Low / Medium / High / X-High / Max** | Override the client with the selected level. |
| **Inherit** | Tier overrides use Default Effort. Fallbacks keep the original request's resolved effort. |

Default Effort starts at **From client**; Fable, Opus, Sonnet and Haiku start at **Inherit**.

## Custom providers
**Admin UI → Providers → Custom providers → Add provider**: enter the API base URL, optional keys and API format. Leave **Model IDs** empty to discover models automatically, or enter one upstream model ID per line.

## Proxy authentication
Enable **Proxy Authentication** in the Admin UI to protect the local proxy with a bearer token. Use **FCC: Set Proxy Auth Token** so this extension sends the same token.
`,
    integrations: `# Client integrations

For editor and app integrations: install the client, start FCC, then open **Admin UI → Integrations** and click **Connect** on its card. Reload VS Code or restart the app/IDE afterwards. Use **Disconnect** on the same card to remove the integration. Run FCC on the same computer and in the same user environment as the client.

${catalog_1.INTEGRATIONS.map((i) => `## ${i.label}\n${i.steps}`).join('\n\n')}
`,
    providers: `# Provider catalog (${catalog_1.PROVIDERS.length})

| Provider | Setting(s) | Example MODEL |
| --- | --- | --- |
${catalog_1.PROVIDERS.map((p) => `| ${p.name} | ${p.env.length ? p.env.map((e) => '`' + e.name + '`').join(' + ') : 'Connect in Admin UI'} | \`${p.example}\` |`).join('\n')}

Source: ${catalog_1.REPO_URL}
`,
};
//# sourceMappingURL=guides.js.map