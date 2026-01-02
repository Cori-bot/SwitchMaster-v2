param (
    [string]$Action = "Focus",
    [string]$Text = ""
)

Add-Type -AssemblyName System.Windows.Forms

# Check for stdin input if Text is empty
if ([string]::IsNullOrEmpty($Text) -and [Console]::IsInputRedirected) {
    try {
        $Text = [Console]::In.ReadLine()
    } catch {
        # Ignore error if reading fails, Text remains empty
    }
}

# Helper pour exclure de l'historique Windows (Win+V) et du Cloud
function Set-SecureClipboard {
    param([string]$Content)
    
    if ([string]::IsNullOrWhiteSpace($Content)) { return }

    try {
        $dataObject = New-Object System.Windows.Forms.DataObject
        
        # 1. Ajouter le texte standard
        $dataObject.SetText($Content, [System.Windows.Forms.TextDataFormat]::UnicodeText)
        
        # 2. Ajouter les métadonnées de sécurité Windows
        # CanIncludeInClipboardHistory = 0 (false)
        # ExcludeFromCloudClipboard = 1 (true)
        $historyFormat = "CanIncludeInClipboardHistory"
        $cloudFormat = "ExcludeFromCloudClipboard"
        
        $zero = [byte[]]@(0,0,0,0)
        $one = [byte[]]@(1,0,0,0)
        
        $msHistory = New-Object System.IO.MemoryStream
        $msHistory.Write($zero, 0, 4)
        $dataObject.SetData($historyFormat, $msHistory)
        
        $msCloud = New-Object System.IO.MemoryStream
        $msCloud.Write($one, 0, 4)
        $dataObject.SetData($cloudFormat, $msCloud)
        
        # Appliquer au presse-papier
        [System.Windows.Forms.Clipboard]::SetDataObject($dataObject, $true)
    }
    catch {
        # Fallback simple si l'objet complexe échoue
        [System.Windows.Forms.Clipboard]::SetText($Content)
    }
}

function Get-RiotWindow {
    $processes = Get-Process | Where-Object { $_.MainWindowTitle -like "*Riot Client*" -or $_.Name -like "RiotClientServices" }
    foreach ($proc in $processes) {
        if ($proc.MainWindowHandle -ne 0) {
            return $proc
        }
    }
    return $null
}

function Set-WindowFocus {
    param([System.Diagnostics.Process]$Process)
    
    if ($Process) {
        # Robust focus : Try multiple times
        $wsh = New-Object -ComObject WScript.Shell
        for ($i=0; $i -lt 3; $i++) {
            $success = $wsh.AppActivate($Process.Id)
            if ($success) { break }
            Start-Sleep -Milliseconds 100
        }
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
Set-WindowFocus -Process $proc

if ($Action -eq "SetSecure") {
    Set-SecureClipboard -Content $Text
    exit 0
}
elseif ($Action -eq "PasteTab") {
    # Paste
    [System.Windows.Forms.SendKeys]::SendWait("^v")
    Start-Sleep -Milliseconds 150
    # Tab
    [System.Windows.Forms.SendKeys]::SendWait("{TAB}")
}
elseif ($Action -eq "PasteEnter") {
    # Paste
    [System.Windows.Forms.SendKeys]::SendWait("^v")
    Start-Sleep -Milliseconds 150
    # Enter
    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
}
elseif ($Action -eq "Clear") {
    [System.Windows.Forms.Clipboard]::Clear()
    exit 0
}
elseif ($Action -eq "PasteEnterStay") {
    # Paste
    [System.Windows.Forms.SendKeys]::SendWait("^v")
    Start-Sleep -Milliseconds 100
    # Stay Signed In sequence (Tab x 6, Enter, Tab, Enter) - based on python script logic
    # "Presser 6 fois Tab pour naviguer au bouton Rester connecté"
    for ($i = 0; $i -lt 6; $i++) {
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
