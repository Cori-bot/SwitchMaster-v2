# Sentinel's Journal

## 2026-01-16 - Process Argument Exposure Fix
**Vulnerability:** Username and password were passed as command-line arguments to a PowerShell script, making them visible to any user on the system via `Get-Process` or Task Manager.
**Learning:** `child_process.spawn` arguments are public information. Powershell scripts often default to `param()` blocks which encourage CLI args, but for secrets, this is dangerous.
**Prevention:** Always pass sensitive data (secrets, PII) via Stdin. The pattern of JSON-over-Stdin works reliably between Node.js and PowerShell: Node uses `ps.stdin.write(JSON.stringify(data)); ps.stdin.end()` and PowerShell uses `$in = [Console]::In.ReadToEnd() | ConvertFrom-Json`.
