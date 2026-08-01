# Entfernt den CCR-/Proxy-Teil aus der Claude settings.json.
# Laesst alles andere (Rechte, Hooks, Plugins, Theme ...) unveraendert.
# Legt vorher ein Backup an.

$ErrorActionPreference = 'Stop'

$path = Join-Path $env:USERPROFILE '.claude\settings.json'
if (-not (Test-Path $path)) {
    Write-Host "FEHLER: settings.json nicht gefunden unter $path"
    exit 1
}

# --- Backup mit Zeitstempel ---
$stamp  = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = "$path.$stamp.bak"
Copy-Item $path $backup -Force
Write-Host "Backup angelegt: $backup"

# --- JSON laden ---
$json = Get-Content $path -Raw | ConvertFrom-Json

$removed = @()

# 1) apiKeyHelper (zeigt auf CCR) entfernen
if ($json.PSObject.Properties.Name -contains 'apiKeyHelper') {
    $json.PSObject.Properties.Remove('apiKeyHelper')
    $removed += 'apiKeyHelper'
}

# 2) env-Block (Proxy-URLs) entfernen
if ($json.PSObject.Properties.Name -contains 'env') {
    $json.PSObject.Properties.Remove('env')
    $removed += 'env (ANTHROPIC_BASE_URL usw.)'
}

# --- Zurueckschreiben (UTF-8 ohne BOM, damit Claude es sauber liest) ---
$out = $json | ConvertTo-Json -Depth 40
[System.IO.File]::WriteAllText($path, $out, (New-Object System.Text.UTF8Encoding($false)))

if ($removed.Count -gt 0) {
    Write-Host ("Entfernt: " + ($removed -join ', '))
} else {
    Write-Host "Es war kein Proxy-Eintrag vorhanden (nichts zu tun)."
}
Write-Host "settings.json wurde bereinigt."
