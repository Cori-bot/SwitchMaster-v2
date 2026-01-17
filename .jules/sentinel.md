## 2025-02-18 - Process Argument Exposure
**Vulnerability:** Sensitive credentials (username/password) were passed as command-line arguments to a PowerShell script via `child_process.spawn`. This allows any user on the system to view the credentials by inspecting running processes (e.g., via Task Manager or `ps`).
**Learning:** Never pass secrets as command-line arguments. OS process lists are public information on most operating systems.
**Prevention:** Pass sensitive data via `stdin` (Standard Input) and use `JSON` serialization to handle special characters safely.
