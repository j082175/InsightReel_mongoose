@echo off
title InsightReel Android Deployment Script
color 0A

echo ================================================================
echo 🚀 InsightReel Android APK 빌드 및 배포 스크립트
echo ================================================================
echo.

:: 변수 설정
set PROJECT_DIR=%~dp0
set ANDROID_DIR=%PROJECT_DIR%InsightReel-ShareExtension
set BUILD_TYPE=release
set APK_OUTPUT_DIR=%ANDROID_DIR%\app\build\outputs\apk\%BUILD_TYPE%
set VERSION_NAME=1.0.0
set TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

echo 📅 빌드 시작 시간: %date% %time%
echo 📁 프로젝트 경로: %PROJECT_DIR%
echo 📱 Android 프로젝트: %ANDROID_DIR%
echo 🏷️ 버전: %VERSION_NAME%
echo.

:: Android 프로젝트 디렉토리로 이동
echo 📂 Android 프로젝트로 이동 중...
cd /d "%ANDROID_DIR%"
if errorlevel 1 (
    echo ❌ Android 프로젝트 디렉토리를 찾을 수 없습니다: %ANDROID_DIR%
    pause
    exit /b 1
)

echo ✅ Android 프로젝트 디렉토리 확인 완료
echo.

:: Gradle 래퍼 권한 확인
echo 🔧 Gradle 설정 확인 중...
if not exist gradlew (
    echo ❌ gradlew 파일을 찾을 수 없습니다.
    pause
    exit /b 1
)

:: 이전 빌드 정리
echo 🧹 이전 빌드 파일 정리 중...
call gradlew clean
if errorlevel 1 (
    echo ❌ Clean 작업 실패
    pause
    exit /b 1
)
echo ✅ Clean 완료
echo.

:: Release APK 빌드
echo 🔨 Release APK 빌드 시작...
echo 이 과정은 몇 분이 소요될 수 있습니다...
call gradlew assembleRelease
if errorlevel 1 (
    echo ❌ APK 빌드 실패
    echo 🔍 가능한 원인:
    echo    - Gradle 설정 오류
    echo    - 의존성 다운로드 실패
    echo    - 코드 컴파일 에러
    echo    - 서명 설정 문제
    pause
    exit /b 1
)

echo ✅ APK 빌드 성공!
echo.

:: 빌드된 APK 파일 확인
echo 📱 빌드된 APK 파일 확인 중...
set APK_FILE=%APK_OUTPUT_DIR%\app-release.apk
if not exist "%APK_FILE%" (
    echo ❌ APK 파일을 찾을 수 없습니다: %APK_FILE%
    echo 📁 출력 디렉토리 내용:
    dir "%APK_OUTPUT_DIR%" 2>nul
    pause
    exit /b 1
)

:: APK 파일 정보 표시
echo ✅ APK 파일 생성 확인
echo 📍 위치: %APK_FILE%
for %%A in ("%APK_FILE%") do (
    echo 📦 크기: %%~zA bytes ^(약 %%~zA/1048576 MB^)
    echo 📅 생성 시간: %%~tA
)
echo.

:: APK 파일 백업 (타임스탬프 포함)
set BACKUP_FILE=%APK_OUTPUT_DIR%\InsightReel_%VERSION_NAME%_%TIMESTAMP%.apk
echo 💾 APK 파일 백업 중...
copy "%APK_FILE%" "%BACKUP_FILE%" >nul
if errorlevel 1 (
    echo ⚠️ 백업 실패 (계속 진행)
) else (
    echo ✅ 백업 완료: %BACKUP_FILE%
)
echo.

:: 서버 업로드 (선택사항)
echo 🌐 서버 업로드 옵션
echo 1. 로컬 테스트만 (기본)
echo 2. 서버에 업로드
set /p UPLOAD_CHOICE="선택하세요 (1 또는 2): "

if "%UPLOAD_CHOICE%"=="2" (
    echo 📤 서버 업로드 시작...

    :: 서버가 실행 중인지 확인
    echo 🔍 서버 상태 확인 중...
    curl -s -f http://localhost:3000/health >nul 2>&1
    if errorlevel 1 (
        echo ❌ 서버가 실행되지 않았습니다. 서버를 먼저 시작해주세요.
        echo 💡 서버 시작 방법: npm run dev
        pause
        exit /b 1
    )

    :: APK 업로드 API 호출 (가상의 엔드포인트)
    echo 📡 APK 파일 업로드 중...
    curl -X POST -F "file=@%APK_FILE%" -F "version=%VERSION_NAME%" http://localhost:3000/api/app-update/upload
    if errorlevel 1 (
        echo ⚠️ 업로드 실패 (APK는 로컬에 저장됨)
    ) else (
        echo ✅ 서버 업로드 완료
    )
) else (
    echo 📱 로컬 테스트 모드 (업로드 건너뛰기)
)
echo.

:: 배포 완료 요약
echo ================================================================
echo 🎉 Android APK 배포 완료!
echo ================================================================
echo 📱 APK 파일: %APK_FILE%
echo 💾 백업 파일: %BACKUP_FILE%
echo 🏷️ 버전: %VERSION_NAME%
echo 📅 빌드 시간: %TIMESTAMP%
echo.
echo 📋 다음 단계:
echo    1. APK 파일을 Android 기기에 설치하여 테스트
echo    2. 기능 동작 확인
echo    3. 문제 없으면 배포 진행
echo.
echo 🔗 테스트 방법:
echo    - adb install "%APK_FILE%"
echo    - 또는 APK 파일을 직접 Android 기기로 전송하여 설치
echo ================================================================

pause
echo.
echo 📱 APK 파일 폴더 열기...
explorer "%APK_OUTPUT_DIR%"

echo.
echo ✅ 배포 스크립트 완료. 창을 닫으셔도 됩니다.
pause