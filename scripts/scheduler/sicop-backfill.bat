@echo off
REM ========================================================================
REM  SICOP backfill: descarga TODO el histórico desde 2010-01.
REM  Usar una sola vez (o tras perder el manifest). Después, sicop-daily.bat.
REM ========================================================================

setlocal enableextensions enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%..\.." >nul

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js no encontrado en PATH. Instalalo desde https://nodejs.org/ ^>= 18.17.
    popd >nul
    exit /b 10
)

REM --extract: descomprime cada ZIP a CSV automaticamente y actualiza catalog.json
node scripts\sicop-downloader\index.js --from 2010-01 --extract %*
set "RC=%errorlevel%"

popd >nul
exit /b %RC%
