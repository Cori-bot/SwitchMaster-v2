## 2025-02-18 - Credential Exposure in Process Arguments
**Vulnerability:** Credentials were passed as command-line arguments to PowerShell scripts.
**Learning:** Command-line arguments are visible in process listings (Task Manager, 'ps'), exposing sensitive data to any user on the system.
**Prevention:** Always pass sensitive data (passwords, API keys) via stdin or environment variables (though env vars can also be leaked in some OSs), preferably stdin.
