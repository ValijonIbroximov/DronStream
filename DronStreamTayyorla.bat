@echo off
rem DronStream: kompyuterni ishga tushirishga tayyorlash (vositalar, build, papkalar, konfiguratsiya shabloni).
setlocal EnableExtensions
set "DS_HERE=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%DS_HERE%scripts\ds-prepare.ps1" %*
set "RC=%ERRORLEVEL%"
if "%RC%"=="0" goto done
echo.
echo DronStreamTayyorla xato bilan tugadi [kod %RC%]. Sabab va log manzili yuqorida ko'rsatilgan.
if not defined DS_NO_PAUSE pause
:done
exit /b %RC%
