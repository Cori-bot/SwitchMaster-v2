## 2025-02-14 - Fix Credential Leakage in Automation

**Vulnerability:** Passwords were being passed as command-line arguments to `powershell.exe`, making them visible in process lists (CWE-214).
**Learning:** `spawn` arguments are not secure. Always use `stdin` for sensitive data.
**Prevention:** Use `stdin` to pipe sensitive data to child processes. In PowerShell, check for `[Console]::IsInputRedirected` and read input.