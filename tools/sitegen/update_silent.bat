@echo off
rem silent update for scheduled task; log: update.log
chcp 65001 >nul
cd /d "%~dp0\..\.."
set PY=C:\Users\Administrator\AppData\Local\Programs\Python\Python312\python.exe
if not exist "%PY%" set PY=python
echo. >> "%~dp0update.log"
echo [%date% %time%] >> "%~dp0update.log"
"%PY%" "tools\sitegen\update_site.py" >> "%~dp0update.log" 2>&1
