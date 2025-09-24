@echo off
chcp 65001 > nul
echo.
echo ========================================
echo InsightReel Quick Deploy (Skip Gradle)
echo ========================================
echo.

REM Navigate to project directory
cd /d "C:\Users\j0821\Documents\___JUNSOOCHO___\InsightReel_mongoose"

echo [1/4] Incrementing version...
node scripts/increment-version.js
if %errorlevel% neq 0 (
    echo ERROR: Version increment failed
    pause
    exit /b 1
)

echo [2/4] Updating server API version...
node scripts/update-server-version.js
if %errorlevel% neq 0 (
    echo ERROR: Server API update failed
    pause
    exit /b 1
)

echo [3/4] Copying existing APK to server...

REM Get version from JSON file
for /f "tokens=*" %%a in ('powershell -command "(Get-Content scripts\version-info.json | ConvertFrom-Json).version"') do set NEW_VERSION=%%a

echo New version: %NEW_VERSION%

REM APK file paths
set SOURCE_APK=InsightReel-ShareExtension\app\build\outputs\apk\debug\app-debug.apk
set TARGET_APK=server\uploads\apk\InsightReel_%NEW_VERSION%.apk

REM Check if source APK exists
if not exist "%SOURCE_APK%" (
    echo ERROR: Source APK not found: %SOURCE_APK%
    pause
    exit /b 1
)

REM Create server upload directory
if not exist "server\uploads\apk" mkdir "server\uploads\apk"

REM Copy APK file
copy "%SOURCE_APK%" "%TARGET_APK%"
if %errorlevel% neq 0 (
    echo ERROR: APK copy failed
    pause
    exit /b 1
)

echo SUCCESS: APK copied to %TARGET_APK%

echo [4/4] Cleaning old APK files (keeping latest 3)...
powershell -command "Get-ChildItem server\uploads\apk\*.apk | Sort-Object LastWriteTime -Descending | Select-Object -Skip 3 | Remove-Item -Force"

echo.
echo ========================================
echo SUCCESS: Quick deploy completed!
echo Version: %NEW_VERSION%
echo ========================================
echo.
echo NOTE: Using existing APK (Gradle skipped)
echo Mobile app will show update notification.
echo Test URL: http://localhost:3000/api/app-update/check
echo.

pause