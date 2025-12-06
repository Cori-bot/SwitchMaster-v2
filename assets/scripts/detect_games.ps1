$paths = @(
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*"
)

$targets = @("Riot", "VALORANT", "League of Legends")
$results = @()

foreach ($path in $paths) {
    Get-ItemProperty -Path $path -ErrorAction SilentlyContinue |
        Where-Object {
            $name = $_.DisplayName
            if ($name) {
                foreach ($t in $targets) {
                    if ($name -like "*$t*") { return $true }
                }
            }
        } |
        ForEach-Object {
            $results += @{
                DisplayName = $_.DisplayName
                InstallLocation = $_.InstallLocation
                Publisher = $_.Publisher
            }
        }
}

# Output as JSON for Node.js parsing
$results | ConvertTo-Json -Depth 2
