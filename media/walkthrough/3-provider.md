# Add a provider and choose a model

1. Create an API key — for example NVIDIA NIM at https://build.nvidia.com/settings/api-keys.
2. Open the **Admin UI**, open the provider under **Providers**, click **Add key**, paste it and **Save**.
3. Pick `MODEL` in the dropdown (default `nvidia_nim/nvidia/nemotron-3-super-120b-a12b`) and click **Apply**.

The Admin UI is FCC's authoritative settings editor. Optionally store keys in VS Code's Secret Storage via **FCC: Store Provider Credential Securely** — they are passed to the server only when it is started from VS Code.
