@echo off
REM Opens markdown-editor.ps1 in this folder. Usage: markdown-editor.bat [file.md]
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0markdown-editor.ps1" %*
