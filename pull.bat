@echo off
rem DronStream: kodni GitHub'dan olish.
rem  - Repozitoriy ichida: xavfsiz yangilash (faqat fast-forward, lokal o'zgarishlar saqlanadi).
rem  - Yangi kompyuterda (faqat shu fayl bor): yonidagi DronStream papkasiga clone qiladi va tayyorlaydi.
rem Bu fayl boshqa skriptlarga tayanmasdan clone qila oladi.
setlocal EnableExtensions
set "HERE=%~dp0"
if not defined DS_REPO_URL set "DS_REPO_URL=https://github.com/ValijonIbroximov/DronStream.git"
set "RC=0"
if exist "%HERE%.git\" if exist "%HERE%scripts\ds-pull.ps1" goto inrepo
goto bootstrap

:inrepo
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%HERE%scripts\ds-pull.ps1" %*
set "RC=%ERRORLEVEL%"
goto end

:bootstrap
set "TARGET=%HERE%DronStream"
echo DronStream: yangi kompyuter rejimi. Manzil: "%TARGET%"
where git >nul 2>nul
if errorlevel 1 goto nogit
if exist "%TARGET%\.git\" goto existing
if not exist "%TARGET%\" goto clone
dir /b /a "%TARGET%" 2>nul | findstr /r "." >nul
if not errorlevel 1 goto busy

:clone
echo Clone: %DS_REPO_URL%
git clone "%DS_REPO_URL%" "%TARGET%"
if errorlevel 1 goto clonefail
echo.
echo Clone tayyor. Endi kompyuter tayyorlanadi: "%TARGET%\DronStreamTayyorla.bat"
call "%TARGET%\DronStreamTayyorla.bat"
set "RC=%ERRORLEVEL%"
echo.
echo Keyingi safar dasturni ochish uchun: "%TARGET%\DronStreamStart.bat"
echo Kodni yangilash uchun: "%TARGET%\pull.bat"
goto end

:existing
echo "%TARGET%" allaqachon Git repozitoriy - u yangilanadi.
call "%TARGET%\pull.bat" %*
set "RC=%ERRORLEVEL%"
goto end

:busy
echo XATO: "%TARGET%" papkasi bor va bo'sh emas. Ustidan yozilmaydi.
echo Uni boshqa joyga ko'chiring yoki pull.bat ni boshqa papkaga qo'yib ishga tushiring.
set "RC=4"
goto end

:nogit
echo XATO: Git topilmadi.
echo O'rnatish: https://git-scm.com/download/win  yoki  winget install --id Git.Git -e
echo O'rnatgach yangi oynada pull.bat ni qayta ishga tushiring.
set "RC=4"
goto end

:clonefail
echo XATO: clone bajarilmadi (internet, GitHub kirishi yoki manzilni tekshiring).
set "RC=1"
goto end

:end
if "%RC%"=="0" exit /b 0
echo.
echo pull tugadi [kod %RC%].
if not defined DS_NO_PAUSE pause
exit /b %RC%
