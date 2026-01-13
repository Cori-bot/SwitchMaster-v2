# Sentinel's Journal

## 2025-02-23 - Command Injection and Process List Exposure
**Vulnerability:** Credentials were leaked in process list because `spawn` was used with arguments.
**Learning:** Process list (ps, Task Manager) shows arguments to all users. Passing sensitive data via args is insecure.
**Prevention:** Pass sensitive data via `stdin` (pipe) and parse it in the child process. Used `[Console]::In.ReadToEnd() | ConvertFrom-Json` in PowerShell.
