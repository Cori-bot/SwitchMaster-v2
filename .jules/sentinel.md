## 2025-02-27 - Credential Leakage via Process Arguments
**Vulnerability:** User credentials (username/password) were passed as command-line arguments to a PowerShell script (`automate_login.ps1`). This exposes sensitive data to any user on the system who can list running processes (e.g., via Task Manager or `ps`).
**Learning:** Process arguments are public information on most operating systems. Never pass secrets via CLI arguments.
**Prevention:** Pass sensitive data via `stdin` (standard input). In PowerShell, use `[Console]::In.ReadToEnd()` to read the input and `ConvertFrom-Json` to parse it if sending structured data. In Node.js, use `spawn` with `stdio: ['pipe', ...]` and write to `child.stdin`.
