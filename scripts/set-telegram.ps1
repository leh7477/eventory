# Telegram bot token setup (with diagnostics)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host ''
Write-Host '=== Telegram token setup ===' -ForegroundColor Cyan
Write-Host 'Paste the token, then press Enter. (hidden)'
Write-Host ''

$sec = Read-Host 'Token' -AsSecureString
$tk = ([Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))).Trim()

# --- diagnostics: shows shape only, never the secret ---
Write-Host ''
Write-Host 'What was received:' -ForegroundColor DarkGray
Write-Host ("  length   : " + $tk.Length + "  (expected 46)")
$parts = $tk -split ':'
Write-Host ("  colons   : " + ($parts.Count - 1) + "  (expected 1)")
Write-Host ("  bot id   : " + $parts[0])
if ($parts.Count -gt 1) {
  $k = $parts[1]
  Write-Host ("  key len  : " + $k.Length + "  (expected 35)")
  Write-Host ("  key head : " + $k.Substring(0, [Math]::Min(6, $k.Length)) + "...")
}
$bad = ($tk.ToCharArray() | Where-Object { [int]$_ -lt 33 -or [int]$_ -gt 126 })
Write-Host ("  odd chars: " + $(if ($bad.Count -eq 0) { 'none' } else { $bad.Count }))
Write-Host ''

if ($tk -notmatch '^\d+:.{30,}$') {
  Write-Host '[FAIL] Bad format.' -ForegroundColor Red
  exit 1
}

Write-Host 'Checking with Telegram...' -ForegroundColor DarkGray
try {
  $me = Invoke-RestMethod "https://api.telegram.org/bot$tk/getMe" -TimeoutSec 15
} catch {
  Write-Host '[FAIL] 401 Unauthorized - Telegram says this token is not valid.' -ForegroundColor Red
  Write-Host ''
  Write-Host 'Compare the "key head" above with the token in BotFather.' -ForegroundColor Yellow
  Write-Host 'If they differ, the paste was altered. Try typing it manually.' -ForegroundColor Yellow
  exit 1
}

Write-Host ('[OK] Bot: @' + $me.result.username) -ForegroundColor Green
$keep = (Get-Content .env.local -Encoding UTF8) | Where-Object { $_ -notmatch '^TELEGRAM_BOT_TOKEN=' }
$utf8 = New-Object System.Text.UTF8Encoding $false
[IO.File]::WriteAllLines("$PWD\.env.local", @($keep) + "TELEGRAM_BOT_TOKEN=$tk", $utf8)
Write-Host '[OK] Saved' -ForegroundColor Green

try {
  $u = Invoke-RestMethod "https://api.telegram.org/bot$tk/getUpdates" -TimeoutSec 15
  Write-Host ''
  if ($u.result.Count -eq 0) {
    Write-Host ('[NEXT] Send any message to @' + $me.result.username + ' in Telegram.') -ForegroundColor Yellow
  } else {
    Write-Host ('[OK] ' + $u.result.Count + ' chat update(s) found.') -ForegroundColor Green
  }
} catch { }
Write-Host ''
