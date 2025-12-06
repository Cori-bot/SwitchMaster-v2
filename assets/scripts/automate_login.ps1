param (
    [string]$Action = "Focus"
)

Add-Type -AssemblyName System.Windows.Forms

function Get-RiotWindow {
    $processes = Get-Process | Where-Object { $_.MainWindowTitle -like "*Riot Client*" -or $_.Name -like "RiotClientServices" }
    foreach ($proc in $processes) {
        if ($proc.MainWindowHandle -ne 0) {
            return $proc
        }
    }
    return $null
}

function Focus-Window {
    param([System.Diagnostics.Process]$Process)
    
    if ($Process) {
        $hwnd = $Process.MainWindowHandle
        # Check if minimized and restore
        $placement = [IntPtr]::Zero
        
        # Simple bring to front
        $wsh = New-Object -ComObject WScript.Shell
        $success = $wsh.AppActivate($Process.Id)
        Start-Sleep -Milliseconds 200
        return $success
    }
    return $false
}

$proc = Get-RiotWindow

if (-not $proc) {
    Write-Host "Window not found"
    exit 1
}

if ($Action -eq "Check") {
    Write-Host "Found"
    exit 0
}

# Always focus first
Focus-Window -Process $proc

if ($Action -eq "PasteTab") {
    # Paste
    [System.Windows.Forms.SendKeys]::SendWait("^v")
    Start-Sleep -Milliseconds 100
    # Tab
    [System.Windows.Forms.SendKeys]::SendWait("{TAB}")
}
elseif ($Action -eq "PasteEnter") {
    # Paste
    [System.Windows.Forms.SendKeys]::SendWait("^v")
    Start-Sleep -Milliseconds 100
    # Enter
    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
}
elseif ($Action -eq "PasteEnterStay") {
    # Paste
    [System.Windows.Forms.SendKeys]::SendWait("^v")
    Start-Sleep -Milliseconds 100
    # Stay Signed In sequence (Tab x 6, Enter, Tab, Enter) - based on python script logic
    # "Presser 6 fois Tab pour naviguer au bouton Rester connecté"
    for ($i=0; $i -lt 6; $i++) {
        [System.Windows.Forms.SendKeys]::SendWait("{TAB}")
        Start-Sleep -Milliseconds 50
    }
    # Toggle Checkbox
    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
    Start-Sleep -Milliseconds 100
    # Tab to Submit
    [System.Windows.Forms.SendKeys]::SendWait("{TAB}")
    Start-Sleep -Milliseconds 50
    # Enter to Submit
    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
}
