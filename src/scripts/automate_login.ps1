# Script optimisé pour le login Riot Client
# Effectue toute la séquence en un seul appel pour minimiser la latence
param (
    [string]$Username = "",
    [string]$Password = ""
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Web.Extensions

if ([Console]::IsInputRedirected) {
    try {
        $inputJson = [Console]::In.ReadToEnd()
        $jsSerializer = New-Object System.Web.Script.Serialization.JavaScriptSerializer
        $data = $jsSerializer.DeserializeObject($inputJson)

        if ($data["Username"]) { $Username = $data["Username"] }
        if ($data["Password"]) { $Password = $data["Password"] }
    }
    catch {
        Write-Host "ERROR: Failed to parse input JSON"
        exit 1
    }
}

# Constantes de timing optimisées
$FOCUS_MAX_ATTEMPTS = 30
$FOCUS_POLL_INTERVAL_MS = 1000
$SHORT_DELAY_MS = 100
$MEDIUM_DELAY_MS = 150
$LONG_DELAY_MS = 500

# Presse-papier sécurisé (exclut de l'historique Windows et du cloud)
function Set-SecureClipboard {
    param([string]$Content)
    
    if ([string]::IsNullOrWhiteSpace($Content)) { return }

    try {
        $dataObject = New-Object System.Windows.Forms.DataObject
        $dataObject.SetText($Content, [System.Windows.Forms.TextDataFormat]::UnicodeText)
        
        # CanIncludeInClipboardHistory = 0, ExcludeFromCloudClipboard = 1
        $zero = [byte[]]@(0,0,0,0)
        $one = [byte[]]@(1,0,0,0)
        
        $msHistory = New-Object System.IO.MemoryStream
        $msHistory.Write($zero, 0, 4)
        $dataObject.SetData("CanIncludeInClipboardHistory", $msHistory)
        
        $msCloud = New-Object System.IO.MemoryStream
        $msCloud.Write($one, 0, 4)
        $dataObject.SetData("ExcludeFromCloudClipboard", $msCloud)
        
        [System.Windows.Forms.Clipboard]::SetDataObject($dataObject, $true)
    }
    catch {
        # Fallback simple
        [System.Windows.Forms.Clipboard]::SetText($Content)
    }
}

# Trouve la fenêtre du Riot Client
function Get-RiotWindow {
    $processes = Get-Process | Where-Object { 
        $_.MainWindowTitle -like "*Riot Client*" -or $_.Name -like "RiotClientServices" 
    }
    foreach ($proc in $processes) {
        if ($proc.MainWindowHandle -ne 0) {
            return $proc
        }
    }
    return $null
}

# Donne le focus à la fenêtre
function Set-WindowFocus {
    param([System.Diagnostics.Process]$Process)
    
    if ($Process) {
        $wsh = New-Object -ComObject WScript.Shell
        for ($i = 0; $i -lt 3; $i++) {
            $success = $wsh.AppActivate($Process.Id)
            if ($success) { break }
            Start-Sleep -Milliseconds $SHORT_DELAY_MS
        }
        Start-Sleep -Milliseconds $MEDIUM_DELAY_MS
        return $success
    }
    return $false
}

# Attend que la fenêtre Riot Client soit disponible
function Wait-ForRiotWindow {
    for ($attempt = 0; $attempt -lt $FOCUS_MAX_ATTEMPTS; $attempt++) {
        $proc = Get-RiotWindow
        if ($proc) {
            return $proc
        }
        Start-Sleep -Milliseconds $FOCUS_POLL_INTERVAL_MS
    }
    return $null
}

# ========== MAIN EXECUTION ==========

# 1. Attendre et trouver la fenêtre
$proc = Wait-ForRiotWindow
if (-not $proc) {
    Write-Host "ERROR: Window not found"
    exit 1
}

# 2. Focus initial
Set-WindowFocus -Process $proc | Out-Null

# 3. Injection Username + Tab
Set-SecureClipboard -Content $Username
Start-Sleep -Milliseconds $SHORT_DELAY_MS
[System.Windows.Forms.SendKeys]::SendWait("^v")
Start-Sleep -Milliseconds $MEDIUM_DELAY_MS
[System.Windows.Forms.SendKeys]::SendWait("{TAB}")
[System.Windows.Forms.Clipboard]::Clear()

# 4. Petit délai entre les champs
Start-Sleep -Milliseconds $LONG_DELAY_MS

# 5. Injection Password + Enter
Set-SecureClipboard -Content $Password
Start-Sleep -Milliseconds $SHORT_DELAY_MS
[System.Windows.Forms.SendKeys]::SendWait("^v")
Start-Sleep -Milliseconds $MEDIUM_DELAY_MS
[System.Windows.Forms.SendKeys]::SendWait("{ENTER}")

# 6. Nettoyage final sécurisé
Start-Sleep -Milliseconds $MEDIUM_DELAY_MS
[System.Windows.Forms.Clipboard]::Clear()

Write-Host "SUCCESS"
exit 0
