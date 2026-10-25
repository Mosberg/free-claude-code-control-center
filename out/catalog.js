"use strict";
/**
 * Static catalog of everything the FCC README documents:
 * providers (61), coding-agent launchers (10), client integrations, model tiers, reasoning levels.
 * Source: https://github.com/Alishahryar1/free-claude-code (README, pyproject.toml [project.scripts]).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RELEASES_API = exports.RAW_BASE = exports.ISSUES_URL = exports.REPO_URL = exports.REASONING_LEVELS = exports.MODEL_TIERS = exports.INTEGRATIONS = exports.AGENTS = exports.PROVIDERS = void 0;
const key = (name, optional = false) => ({ name, secret: true, optional });
const val = (name, prompt, defaultValue, optional = false) => ({
    name,
    secret: false,
    optional,
    prompt,
    defaultValue,
});
exports.PROVIDERS = [
    { id: 'nvidia_nim', name: 'NVIDIA NIM', kind: 'cloud', env: [key('NVIDIA_NIM_API_KEY')], example: 'nvidia_nim/nvidia/nemotron-3-super-120b-a12b', url: 'https://build.nvidia.com/settings/api-keys', note: 'Default provider in the FCC quick start. Also used for NVIDIA NIM voice transcription.' },
    { id: 'open_router', name: 'OpenRouter', kind: 'cloud', env: [key('OPENROUTER_API_KEY')], example: 'open_router/openrouter/free', url: 'https://openrouter.ai/keys' },
    { id: 'groq', name: 'Groq', kind: 'cloud', env: [key('GROQ_API_KEY')], example: 'groq/llama-3.3-70b-versatile', url: 'https://console.groq.com/keys' },
    { id: 'cline_pass', name: 'ClinePass', kind: 'cloud', env: [key('CLINE_API_KEY')], example: 'cline_pass/cline-pass/kimi-k3', url: 'https://docs.cline.bot/getting-started/clinepass' },
    { id: 'openai', name: 'OpenAI / ChatGPT (subscription)', kind: 'oauth', env: [], example: 'openai/<model-id>', url: 'https://learn.chatgpt.com/docs/auth', note: 'Uses your ChatGPT subscription. In the Admin UI: Providers → OAuth providers → OpenAI / ChatGPT → Connect, finish sign-in in the browser, then restart any running agent.' },
    { id: 'openai_api', name: 'OpenAI API', kind: 'cloud', env: [key('OPENAI_API_KEY')], example: 'openai_api/gpt-5.6-sol', url: 'https://platform.openai.com/api-keys', note: 'Separate Platform API key. The model list may include IDs that cannot do coding requests; choose a text-generation model.' },
    { id: 'github_copilot', name: 'GitHub Copilot', kind: 'oauth', env: [], example: 'github_copilot/<model-id>', url: 'https://docs.github.com/en/copilot/how-tos/copilot-sdk/auth/authenticate', note: 'Install Copilot CLI 1.0.83 on PATH (https://github.com/github/copilot-cli/releases/tag/v1.0.83), then Admin UI: Providers → OAuth providers → GitHub Copilot → Connect. Models and quotas depend on your subscription and org policy.' },
    { id: 'xai', name: 'xAI (Grok)', kind: 'cloud', env: [key('XAI_API_KEY')], example: 'xai/grok-4.5', url: 'https://console.x.ai/team/default/api-keys' },
    { id: 'alibaba_cloud', name: 'Alibaba Cloud (Model Studio)', kind: 'cloud', env: [key('ALIBABA_CLOUD_API_KEY'), val('ALIBABA_CLOUD_BASE_URL', 'Optional: OpenAI-compatible endpoint ending in /compatible-mode/v1 (default: Singapore). Key and endpoint must be in the same region.', undefined, true)], example: 'alibaba_cloud/<model-id>', url: 'https://www.alibabacloud.com/help/en/model-studio/get-api-key', note: 'Pay-as-you-go Model Studio key; defaults to Singapore.' },
    { id: 'qwencloud', name: 'QwenCloud Token Plan', kind: 'cloud', env: [key('QWENCLOUD_API_KEY')], example: 'qwencloud/qwen3.7-plus', url: 'https://home.qwencloud.com/api-keys', note: 'Token Plan keys use qwencloud/. Not interchangeable with Coding Plan keys.' },
    { id: 'qwencloud_coding', name: 'QwenCloud Coding Plan', kind: 'cloud', env: [key('QWENCLOUD_CODING_API_KEY')], example: 'qwencloud_coding/qwen3.7-plus', url: 'https://home.qwencloud.com/api-keys', note: 'For local, personal, interactive coding-agent use under the Coding Plan terms.' },
    { id: 'together', name: 'Together AI', kind: 'cloud', env: [key('TOGETHER_API_KEY')], example: 'together/zai-org/GLM-5.2', url: 'https://api.together.ai/settings/api-keys' },
    { id: 'deepinfra', name: 'DeepInfra', kind: 'cloud', env: [key('DEEPINFRA_API_KEY')], example: 'deepinfra/deepseek-ai/DeepSeek-V4-Flash', url: 'https://deepinfra.com/dash/api_keys' },
    { id: 'siliconflow', name: 'SiliconFlow', kind: 'cloud', env: [key('SILICONFLOW_API_KEY')], example: 'siliconflow/Qwen/Qwen3-32B', url: 'https://cloud.siliconflow.com/account/ak' },
    { id: 'nebius', name: 'Nebius Token Factory', kind: 'cloud', env: [key('NEBIUS_API_KEY')], example: 'nebius/Qwen/Qwen3-30B-A3B', url: 'https://tokenfactory.nebius.com/project/api-keys' },
    { id: 'chutes', name: 'Chutes', kind: 'cloud', env: [key('CHUTES_API_KEY')], example: 'chutes/Qwen/Qwen3-32B-TEE', url: 'https://chutes.ai/docs/getting-started/authentication' },
    { id: 'featherless', name: 'Featherless AI', kind: 'cloud', env: [key('FEATHERLESS_API_KEY')], example: 'featherless/Qwen/Qwen3-32B', url: 'https://featherless.ai/account/api-keys' },
    { id: 'agnes', name: 'Agnes AI', kind: 'cloud', env: [key('AGNES_API_KEY')], example: 'agnes/agnes-2.0-flash', url: 'https://agnes-ai.com/' },
    { id: 'zenmux', name: 'ZenMux', kind: 'cloud', env: [key('ZENMUX_API_KEY')], example: 'zenmux/deepseek/deepseek-v4-flash-free', url: 'https://zenmux.ai/platform/pay-as-you-go' },
    { id: 'wandb', name: 'W&B Inference', kind: 'cloud', env: [key('WANDB_API_KEY')], example: 'wandb/openai/gpt-oss-20b', url: 'https://wandb.ai/settings' },
    { id: 'anthropic', name: 'Anthropic (API key, separately billed)', kind: 'cloud', env: [key('ANTHROPIC_API_KEY'), val('ANTHROPIC_WORKSPACE_ID', 'Optional: workspace ID (required only for multi-workspace keys)', undefined, true)], example: 'anthropic/<model-id>', url: 'https://platform.claude.com/settings/keys', note: 'Admin UI: Providers → Cloud providers → Anthropic → Configure, then choose a discovered model.' },
    { id: 'azure_openai', name: 'Azure OpenAI', kind: 'cloud', env: [key('AZURE_OPENAI_API_KEY'), val('AZURE_OPENAI_BASE_URL', 'Complete v1 endpoint, e.g. https://YOUR-RESOURCE-NAME.openai.azure.com/openai/v1/')], example: 'azure_openai/<deployment-name>', url: 'https://learn.microsoft.com/azure/foundry/openai/how-to/chatgpt', note: 'Use your deployment names; the deployment must support Chat Completions. Enter the deployment name as a custom model slug if it is not listed.' },
    { id: 'gemini', name: 'Google AI Studio (Gemini)', kind: 'cloud', env: [key('GEMINI_API_KEY')], example: 'gemini/models/gemini-3.1-flash-lite', url: 'https://aistudio.google.com/apikey' },
    { id: 'vertex', name: 'Google Vertex AI', kind: 'adc', env: [val('VERTEX_PROJECT_ID', 'Google Cloud project ID'), val('VERTEX_LOCATION', "Optional: location (default 'global')", undefined, true)], example: 'vertex/google/gemini-3.5-flash', url: 'https://cloud.google.com/vertex-ai/generative-ai/docs/start/openai', note: 'Uses Google Application Default Credentials instead of an API key. Run `gcloud auth application-default login` once (service-account files and attached service accounts also work).' },
    { id: 'deepseek', name: 'DeepSeek', kind: 'cloud', env: [key('DEEPSEEK_API_KEY')], example: 'deepseek/deepseek-chat', url: 'https://platform.deepseek.com/api_keys' },
    { id: 'mistral', name: 'Mistral La Plateforme', kind: 'cloud', env: [key('MISTRAL_API_KEY')], example: 'mistral/devstral-small-latest', url: 'https://console.mistral.ai/' },
    { id: 'mistral_codestral', name: 'Mistral Codestral', kind: 'cloud', env: [key('CODESTRAL_API_KEY')], example: 'mistral_codestral/codestral-latest', url: 'https://console.mistral.ai/', note: 'Separate key from Mistral La Plateforme.' },
    { id: 'opencode_zen', name: 'OpenCode Zen', kind: 'cloud', env: [key('OPENCODE_API_KEY')], example: 'opencode_zen/gpt-5.3-codex', url: 'https://opencode.ai/auth', note: 'Shares OPENCODE_API_KEY with OpenCode Go but uses the explicit opencode_zen/ prefix.' },
    { id: 'opencode_go', name: 'OpenCode Go', kind: 'cloud', env: [key('OPENCODE_API_KEY')], example: 'opencode_go/minimax-m2.7', url: 'https://opencode.ai/auth', note: 'Shares OPENCODE_API_KEY with OpenCode Zen but uses the explicit opencode_go/ prefix.' },
    { id: 'vercel', name: 'Vercel AI Gateway', kind: 'cloud', env: [key('AI_GATEWAY_API_KEY')], example: 'vercel/openai/gpt-5.5', url: 'https://vercel.com/docs/ai-gateway/models-and-providers' },
    { id: 'bedrock', name: 'Amazon Bedrock', kind: 'cloud', env: [key('AWS_BEARER_TOKEN_BEDROCK'), val('BEDROCK_BASE_URL', 'Bedrock URL for the same region as the API key')], example: 'bedrock/openai.gpt-oss-120b', url: 'https://console.aws.amazon.com/bedrock/', note: 'BEDROCK_BASE_URL must be in the same region as the API key; select one of the listed models.' },
    { id: 'huggingface', name: 'Hugging Face Inference Providers', kind: 'cloud', env: [key('HUGGINGFACE_API_KEY')], example: 'huggingface/Qwen/Qwen3-Coder-480B-A35B-Instruct:fastest', url: 'https://huggingface.co/settings/tokens', note: 'Also needed for gated local Whisper models.' },
    { id: 'cohere', name: 'Cohere', kind: 'cloud', env: [key('COHERE_API_KEY')], example: 'cohere/command-a-plus-05-2026', url: 'https://dashboard.cohere.com/api-keys' },
    { id: 'wafer', name: 'Wafer', kind: 'cloud', env: [key('WAFER_API_KEY')], example: 'wafer/DeepSeek-V4-Pro', url: 'https://wafer.ai/' },
    { id: 'kimi', name: 'Kimi API (credits)', kind: 'cloud', env: [key('KIMI_API_KEY')], example: 'kimi/kimi-k2.5', url: 'https://platform.moonshot.ai/console/api-keys', note: 'Kimi API credit keys use kimi/. Kimi Code subscription keys use kimi_code/.' },
    { id: 'kimi_code', name: 'Kimi Code (subscription)', kind: 'cloud', env: [key('KIMI_CODE_API_KEY')], example: 'kimi_code/k3', url: 'https://www.kimi.com/code/console', note: "Personal interactive coding-agent use under Kimi's community guidelines." },
    { id: 'minimax', name: 'MiniMax', kind: 'cloud', env: [key('MINIMAX_API_KEY')], example: 'minimax/MiniMax-M3', url: 'https://platform.minimax.io/user-center/basic-information/interface-key' },
    { id: 'cerebras', name: 'Cerebras Inference', kind: 'cloud', env: [key('CEREBRAS_API_KEY')], example: 'cerebras/gpt-oss-120b', url: 'https://cloud.cerebras.ai/' },
    { id: 'sambanova', name: 'SambaNova', kind: 'cloud', env: [key('SAMBANOVA_API_KEY')], example: 'sambanova/Meta-Llama-3.3-70B-Instruct', url: 'https://cloud.sambanova.ai/apis' },
    { id: 'kilo', name: 'Kilo.ai', kind: 'cloud', env: [key('KILO_API_KEY')], example: 'kilo/kilo-auto/free', url: 'https://kilo.ai' },
    { id: 'fireworks', name: 'Fireworks AI', kind: 'cloud', env: [key('FIREWORKS_API_KEY')], example: 'fireworks/accounts/fireworks/models/llama-v3p3-70b-instruct', url: 'https://fireworks.ai/account/api-keys' },
    { id: 'novita', name: 'Novita AI', kind: 'cloud', env: [key('NOVITA_API_KEY')], example: 'novita/deepseek/deepseek-v4-flash-0731', url: 'https://novita.ai/settings/key-management' },
    { id: 'cloudflare', name: 'Cloudflare Workers AI', kind: 'cloud', env: [key('CLOUDFLARE_API_TOKEN'), val('CLOUDFLARE_ACCOUNT_ID', 'Cloudflare account ID')], example: 'cloudflare/@cf/moonshotai/kimi-k2.6', url: 'https://developers.cloudflare.com/workers-ai/', note: 'Requires both the API token and the account ID.' },
    { id: 'zai', name: 'Z.ai Coding Plan', kind: 'cloud', env: [key('ZAI_API_KEY')], example: 'zai/glm-5.2', url: 'https://z.ai/manage-apikey/apikey-list' },
    { id: 'zai_api', name: 'Z.ai API (pay as you go)', kind: 'cloud', env: [key('ZAI_API_KEY')], example: 'zai_api/glm-4.7-flash', url: 'https://z.ai/manage-apikey/apikey-list' },
    { id: 'tokenrouter', name: 'TokenRouter', kind: 'cloud', env: [key('TOKENROUTER_API_KEY')], example: 'tokenrouter/moonshotai/kimi-k3-free', url: 'https://www.tokenrouter.com/' },
    { id: 'nararoute', name: 'NaraRoute', kind: 'cloud', env: [key('NARAROUTE_API_KEY')], example: 'nararoute/kimi-k3-free', url: 'https://router.bynara.id/' },
    { id: 'poolside', name: 'Poolside AI', kind: 'cloud', env: [key('POOLSIDE_API_KEY')], example: 'poolside/poolside/laguna-s-2.1', url: 'https://platform.poolside.ai/' },
    { id: 'llm7', name: 'LLM7.io', kind: 'cloud', env: [key('LLM7_API_KEY')], example: 'llm7/default', url: 'https://dash.llm7.io/' },
    { id: 'scaleway', name: 'Scaleway', kind: 'cloud', env: [key('SCW_SECRET_KEY')], example: 'scaleway/deepseek/deepseek-v4-flash', url: 'https://console.scaleway.com/iam/api-keys' },
    { id: 'lightning', name: 'Lightning AI', kind: 'cloud', env: [key('LIGHTNING_API_KEY')], example: 'lightning/lightning-ai/Qwen3.8-27B', url: 'https://lightning.ai/' },
    { id: 'experiential', name: 'Experiential Labs', kind: 'cloud', env: [key('EXPLABS_API_KEY')], example: 'experiential/union-alpha', url: 'https://platform.experientiallabs.ai/' },
    { id: 'cheaperinference', name: 'Cheaper Inference', kind: 'cloud', env: [key('CHEAPER_INFERENCE_API_KEY')], example: 'cheaperinference/gpt-5.4-mini', url: 'https://cheaperinference.com/signup' },
    { id: 'orcarouter', name: 'OrcaRouter', kind: 'cloud', env: [key('ORCAROUTER_API_KEY')], example: 'orcarouter/deepseek/deepseek-v4-flash-free', url: 'https://www.orcarouter.ai/' },
    { id: 'atlascloud', name: 'Atlas Cloud', kind: 'cloud', env: [key('ATLASCLOUD_API_KEY')], example: 'atlascloud/deepseek-ai/deepseek-v4-flash', url: 'https://console.atlascloud.ai/api-keys' },
    { id: 'xkiro', name: 'xKiro', kind: 'cloud', env: [key('XKIRO_API_KEY')], example: 'xkiro/qwen/qwen3.7-flash:free', url: 'https://xkiro.com/' },
    { id: 'opper', name: 'Opper', kind: 'cloud', env: [key('OPPER_API_KEY')], example: 'opper/claude-sonnet-4-6', url: 'https://platform.opper.ai/' },
    { id: 'ollama_cloud', name: 'Ollama Cloud', kind: 'cloud', env: [key('OLLAMA_API_KEY')], example: 'ollama_cloud/qwen3-coder:480b', url: 'https://ollama.com/settings/keys', note: 'Use the exact model IDs shown in the picker. Local Ollama uses the separate ollama/ prefix.' },
    { id: 'lmstudio', name: 'LM Studio (local)', kind: 'local', env: [val('LM_STUDIO_BASE_URL', 'LM Studio server URL', 'http://localhost:1234/v1')], example: 'lmstudio/<model-id>', url: 'https://lmstudio.ai/', note: "Start LM Studio's local server, load a tool-capable model, use the model identifier shown by LM Studio." },
    { id: 'llamacpp', name: 'llama.cpp (local)', kind: 'local', env: [val('LLAMACPP_BASE_URL', 'llama-server URL', 'http://localhost:8080/v1')], example: 'llamacpp/<model-id>', url: 'https://github.com/ggml-org/llama.cpp', note: 'Start llama-server with its OpenAI-compatible Chat Completions API and enough context for the model.' },
    { id: 'ollama', name: 'Ollama (local)', kind: 'local', env: [val('OLLAMA_BASE_URL', 'Ollama URL', 'http://localhost:11434')], example: 'ollama/<model-tag>', url: 'https://ollama.com/', note: 'Run `ollama pull llama3.1` and `ollama serve`; use the tag shown by `ollama list`.' },
];
exports.AGENTS = [
    { id: 'claude', label: 'Claude Code', command: 'fcc-claude', description: 'Anthropic Claude Code CLI via FCC', homepage: 'https://code.claude.com/docs/en/overview' },
    { id: 'codex', label: 'Codex', command: 'fcc-codex', description: 'OpenAI Codex CLI via FCC', homepage: 'https://github.com/openai/codex' },
    { id: 'pi', label: 'Pi', command: 'fcc-pi', description: 'Pi coding agent', homepage: 'https://github.com/earendil-works/pi' },
    { id: 'opencode', label: 'OpenCode 2', command: 'fcc-opencode', description: 'OpenCode coding agent', homepage: 'https://github.com/anomalyco/opencode' },
    { id: 'cline', label: 'Cline', command: 'fcc-cline', description: 'Cline coding agent', homepage: 'https://github.com/cline/cline' },
    { id: 'hermes', label: 'Hermes', command: 'fcc-hermes', description: 'Nous Research Hermes agent', homepage: 'https://github.com/NousResearch/hermes-agent' },
    { id: 'dsh', label: 'DeepSeek Harness (Web)', command: 'fcc-dsh', description: 'DeepSeek Harness web UI', homepage: 'https://github.com/deepseek-ai/deepseek-harness' },
    { id: 'grok', label: 'Grok Build', command: 'fcc-grok', description: 'xAI Grok Build', homepage: 'https://github.com/xai-org/grok-build' },
    { id: 'muse', label: 'Muse Code', command: 'fcc-muse', description: 'Meta Muse Code', homepage: 'https://research.meta.ai/blog/introducing-muse-code-and-muse-spark-1-2/' },
    { id: 'aider', label: 'Aider', command: 'fcc-aider', description: 'Aider pair-programming CLI', homepage: 'https://aider.chat/' },
];
exports.INTEGRATIONS = [
    { id: 'claude-code-vscode', label: 'Claude Code in VS Code', description: 'Anthropic Claude Code extension routed through FCC', extensionId: 'anthropic.claude-code', steps: 'Install the Claude Code extension, start FCC, then Admin UI → Integrations → Connect. Or use "FCC: Point Claude Code for VS Code at FCC". Reload VS Code afterwards. Connecting also completes Claude Code onboarding.' },
    { id: 'vscode-chat', label: 'VS Code Chat', description: "FCC models in VS Code's built-in Chat model picker", steps: 'Install the latest VS Code, start FCC, Admin UI → Integrations → Connect on the VS Code Chat card, reload VS Code, then select an FCC model in the Chat model picker.' },
    { id: 'codex-vscode', label: 'Codex in VS Code and App', description: 'OpenAI Codex extension / Codex App', extensionId: 'openai.chatgpt', steps: 'Install the Codex extension (or Codex App), start FCC, Admin UI → Integrations → Connect, reload/restart, then pick an FCC model from the model picker.' },
    { id: 'claude-desktop', label: 'Claude Desktop', description: 'Claude Desktop app routed through FCC', steps: 'Install Claude Desktop. Fully quit it before connecting or disconnecting, then reopen it. Disconnect returns to normal Claude sign-in.' },
    { id: 'dsh-desktop', label: 'DeepSeek Harness Desktop', description: 'DeepSeek Harness desktop app', steps: 'Install and open the app once before connecting. Start a new session to use FCC models.' },
    { id: 'jetbrains-acp', label: 'Claude Code in JetBrains (ACP)', description: 'Claude Agent in JetBrains AI Assistant', steps: 'Install Claude Agent in JetBrains AI Assistant and start it once, click Connect in FCC, reopen the IDE, select "Claude Code (FCC)" and start a new chat. After JetBrains updates the agent, restart FCC before starting a new chat. Requires a local IDE in standard install locations.' },
    { id: 'claude-onboarding', label: 'Claude Code onboarding', description: 'Complete Claude Code onboarding separately', steps: 'Admin UI → Integrations → Claude Code onboarding → Complete onboarding.' },
];
exports.MODEL_TIERS = [
    { env: 'MODEL_FABLE', label: 'Fable' },
    { env: 'MODEL_OPUS', label: 'Opus' },
    { env: 'MODEL_SONNET', label: 'Sonnet' },
    { env: 'MODEL_HAIKU', label: 'Haiku' },
];
exports.REASONING_LEVELS = ['Inherit', 'Off', 'From client', 'Low', 'Medium', 'High', 'X-High', 'Max'];
exports.REPO_URL = 'https://github.com/Alishahryar1/free-claude-code';
exports.ISSUES_URL = `${exports.REPO_URL}/issues`;
exports.RAW_BASE = 'https://raw.githubusercontent.com/Alishahryar1/free-claude-code/main/scripts';
exports.RELEASES_API = 'https://api.github.com/repos/Alishahryar1/free-claude-code/releases/latest';
//# sourceMappingURL=catalog.js.map