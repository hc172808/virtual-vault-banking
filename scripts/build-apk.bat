@echo off
REM ============================================
REM StableCoin Banking APK Build Script (Windows)
REM ============================================
REM This script builds an Android APK for distribution
REM 
REM Prerequisites:
REM 1. Node.js and npm installed
REM 2. Android Studio installed with SDK
REM 3. Java JDK 11+ installed
REM 4. ANDROID_HOME environment variable set
REM
REM Usage:
REM   scripts\build-apk.bat
REM ============================================

echo ==========================================
echo StableCoin Banking - APK Build Script
echo ==========================================

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js is not installed
    exit /b 1
)

REM Check npm
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: npm is not installed
    exit /b 1
)

REM Check ANDROID_HOME
if "%ANDROID_HOME%"=="" (
    echo Warning: ANDROID_HOME not set
    if exist "%LOCALAPPDATA%\Android\Sdk" (
        set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
    ) else (
        echo Error: Could not find Android SDK
        exit /b 1
    )
)

echo All requirements met!

REM Check if Android platform exists
if not exist "android" (
    echo Adding Android platform...
    call npx cap add android
)

REM Install dependencies
echo Installing dependencies...
call npm install

REM Build web app
echo Building web application...
call npm run build

REM Sync Capacitor
echo Syncing Capacitor...
call npx cap sync android

REM Build APK
echo Building APK...
cd android
call gradlew.bat assembleDebug

REM Copy APK
copy app\build\outputs\apk\debug\app-debug.apk ..\stablecoin-banking-debug.apk

cd ..

echo ==========================================
echo Build completed successfully!
echo APK Location: %CD%\stablecoin-banking-debug.apk
echo ==========================================

pause
