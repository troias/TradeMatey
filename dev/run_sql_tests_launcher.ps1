# Launcher that explicitly runs the main script with -File so the param block is recognized.
param(
    [switch] $DryRun,
    [switch] $ConfirmRun
)
$scriptPath = Join-Path $PSScriptRoot 'run_sql_tests.ps1'
$flags = @()
if ($DryRun) { $flags += '-DryRun' }
if ($ConfirmRun) { $flags += '-ConfirmRun' }
$argLine = $flags -join ' '
Write-Host "Launching test runner: powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath $argLine"
powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath $argLine
