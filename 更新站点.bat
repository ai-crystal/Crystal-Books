@echo off
rem 双击即可：重建页数 → 生成页面 → 有变化就提交并推送
chcp 65001 >nul
cd /d "%~dp0"
set PY=C:\Users\Administrator\AppData\Local\Programs\Python\Python312\python.exe
if exist "%PY%" goto run
set PY=py
:run
"%PY%" "tools\sitegen\update_site.py"
echo.
pause
