## 2024-05-23 - Credential Exposure via Process Arguments
**Vulnerability:** Passwords and usernames were being passed as command-line arguments to `powershell.exe` in `src/main/automation.ts`. This allows any local user to see the credentials by inspecting running processes (e.g., via Task Manager or `ps`).
**Learning:** Even short-lived processes expose their arguments to the OS process table. Automation scripts that take sensitive inputs must not accept them as parameters.
**Prevention:** Always pass sensitive data via `stdin` (Standard Input) or encrypted files. Avoid environment variables for secrets if possible, as they can also leak in some environments, but definitely never use command-line arguments.
