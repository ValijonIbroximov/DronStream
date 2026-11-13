@echo off
rem DronStream: o'zgarishlarni tekshirish, commit va GitHub'ga yuborish (force ishlatilmaydi).
rem Avtomatik: push.bat -Message "commit xabari"
setlocal EnableExtensions
set "DS_HERE=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%DS_HERE%scripts\ds-push.ps1" %*
set "RC=%ERRORLEVEL%"
if "%RC%"=="0" goto done
echo.
echo push xato bilan tugadi [kod %RC%]. Sabab va log manzili yuqorida ko'rsatilgan.
if not defined DS_NO_PAUSE pause
:done
exit /b %RC%
