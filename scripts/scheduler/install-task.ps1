<#
.SYNOPSIS
    Registra (o actualiza) la tarea programada de Windows que ejecuta el descargador SICOP a diario.

.DESCRIPTION
    Crea una tarea llamada "SICOP-Daily-Download" que corre todos los días a la
    hora indicada (por defecto 08:30, después de las 08:00 en que SICOP refresca el ZIP del mes actual).

    Requiere ejecutar PowerShell como Administrador. Para tareas de usuario sin admin
    usa el Programador de Tareas manual.

.PARAMETER Time
    Hora de ejecución diaria, formato 24h "HH:mm". Default 08:30.

.PARAMETER TaskName
    Nombre de la tarea. Default "SICOP-Daily-Download".

.PARAMETER User
    Cuenta bajo la que se ejecuta. Default: usuario actual.

.PARAMETER WhatIf
    Muestra qué se haría sin registrar la tarea.

.EXAMPLE
    .\scripts\scheduler\install-task.ps1
    .\scripts\scheduler\install-task.ps1 -Time '09:15' -TaskName 'SICOP-Diario'
#>

[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$Time = '08:30',
    [string]$TaskName = 'SICOP-Daily-Download',
    [string]$User = "$env:USERDOMAIN\$env:USERNAME"
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Resolve-Path (Join-Path $scriptDir '..\..')).Path
$batPath = Join-Path $projectRoot 'scripts\scheduler\sicop-daily.bat'

if (-not (Test-Path $batPath)) {
    throw "No se encontró $batPath"
}

if ($Time -notmatch '^\d{2}:\d{2}$') {
    throw "Formato de hora inválido: '$Time'. Use HH:mm (ej. 08:30)."
}

Write-Host "Proyecto:   $projectRoot"
Write-Host "Batch:      $batPath"
Write-Host "Hora:       $Time"
Write-Host "Tarea:      $TaskName"
Write-Host "Usuario:    $User"

$action = New-ScheduledTaskAction -Execute $batPath -WorkingDirectory $projectRoot
$trigger = New-ScheduledTaskTrigger -Daily -At $Time
$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -DontStopOnIdleEnd `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 10) `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
    -MultipleInstances IgnoreNew

if ($PSCmdlet.ShouldProcess($TaskName, 'Register-ScheduledTask')) {
    if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
        Write-Host "Tarea existente — actualizando..."
        Set-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings
    } else {
        Register-ScheduledTask `
            -TaskName $TaskName `
            -Action $action `
            -Trigger $trigger `
            -Settings $settings `
            -User $User `
            -RunLevel Limited `
            -Description 'Descarga diaria del ZIP del mes en curso del Observatorio SICOP.'
    }
    Write-Host "OK. Verifica con: Get-ScheduledTask -TaskName '$TaskName' | Get-ScheduledTaskInfo"
}
