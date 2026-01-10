## 2025-05-23 - Credential Leak via CLI Arguments
**Vulnerability:** Credentials (username/password) were passed to `powershell.exe` as command-line arguments. This makes them visible to any user on the system via process listing tools (e.g., Task Manager, `ps`, `wmic`).
**Learning:** `spawn` arguments are not private. Always treat process arguments as public information.
**Prevention:** Pass sensitive data via `stdin`. In PowerShell, check `[Console]::IsInputRedirected` and read from `[Console]::In`. In Node, write to `child.stdin`.
