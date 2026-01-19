## 2024-05-24 - Secure Credential Passing to Subprocesses
**Vulnerability:** Passwords were passed as command-line arguments to PowerShell scripts (e.g., `spawn("powershell.exe", ["-Password", password])`).
**Learning:** Command-line arguments are visible to all users on the system via process listing tools (like `ps` or Task Manager).
**Prevention:** Always pass sensitive information to subprocesses via standard input (stdin). In PowerShell, use `[Console]::IsInputRedirected` and `[Console]::In.ReadToEnd()` to read the input. In Node.js, write to `child.stdin`.
