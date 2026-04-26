@echo off
REM ========================================================================
REM  SICOP daily downloader (modo "diario rapido": solo el mes en curso).
REM
REM  Uso manual:
REM      scripts\scheduler\sicop-daily.bat
REM
REM  Programado en Windows Task Scheduler (ver scripts\scheduler\install-task.ps1).
REM ========================================================================

setlocal enableextensions enabledelayedexpansion

REM Carpeta del proyecto = dos niveles arriba de este .bat
set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%..\.." >nul

REM Asegura que node este en PATH (por defecto, Task Scheduler hereda variables del sistema)
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js no encontrado en PATH. Instalalo desde https://nodejs.org/ ^>= 18.17.
    popd >nul
    exit /b 10
)

REM --current-only: solo procesa el mes en curso (el unico que cambia diariamente)
REM --extract: tras descargar, descomprime los CSV y actualiza el catalogo
node scripts\sicop-downloader\index.js --current-only --extract %*
set "RC=%errorlevel%"

popd >nul
exit /b %RC%
