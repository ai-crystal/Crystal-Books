@echo off
rem One click: scan pages -> build pages -> commit & push if changed
chcp 65001 >nul
cd /d "%~dp0"
set PY=C:\Users\Administrator\AppData\Local\Programs\Python\Python312\python.exe
if exist "%PY%" goto run
set PY=python
:run
"%PY%" "tools\sitegen\update_site.py"
echo.
pause
