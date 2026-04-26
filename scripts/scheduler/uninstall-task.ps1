<#
.SYNOPSIS
    Elimina la tarea programada SICOP.
#>

[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$TaskName = 'SICOP-Daily-Download'
)

$ErrorActionPreference = 'Stop'

if (-not (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue)) {
    Write-Host "No existe tarea '$TaskName'. Nada que hacer."
    exit 0
}

if ($PSCmdlet.ShouldProcess($TaskName, 'Unregister-ScheduledTask')) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Tarea '$TaskName' eliminada."
}
