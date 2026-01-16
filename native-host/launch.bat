@echo off
REM ChromeLink Native Host Launcher for Windows
REM This wrapper ensures the correct node version is used

REM Don't kill existing process - let the new one handle port conflict

REM Change to the native host directory
cd /d "%~dp0"

REM Launch the server with error logging
node browser-link-server.js 2>> %TEMP%\chromelink-error.log
