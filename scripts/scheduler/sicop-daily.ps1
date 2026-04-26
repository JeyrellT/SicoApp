<#
.SYNOPSIS
    Descarga diaria de SICOP (modo "solo mes actual").

.DESCRIPTION
    Equivalente a sicop-daily.bat pero en PowerShell.
    Pensado para uso manual, integración con CI o como acción de Task Scheduler.

.PARAMETER ExtraArgs
    Argumentos adicionales que se pasan tal cual al CLI Node.

.EXAMPLE
    .\scripts\scheduler\sicop-daily.ps1
    .\scripts\scheduler\sicop-daily.ps1 -ExtraArgs '--verbose'
#>

[CmdletBinding()]
param(
    [string]$ExtraArgs = ''
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path $scriptDir '..\..')

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js no encontrado en PATH. Instala >= 18.17 desde https://nodejs.org/"
    exit 10
}

Push-Location $projectRoot
try {
    $cliPath = Join-Path $projectRoot 'scripts\sicop-downloader\index.js'
    # --current-only solo el mes en curso, --extract descomprime tras descargar
    $argList = @('--current-only', '--extract')
    if ($ExtraArgs) {
        $argList += $ExtraArgs.Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries)
    }
    & node $cliPath @argList
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
