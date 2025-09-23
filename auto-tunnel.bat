@echo off
title InsightReel Auto Tunnel
echo ========================================
echo    InsightReel 자동 터널 시스템 시작
echo ========================================
echo.

:restart
echo [%time%] 터널 시작 중... insightreel-mobile-test.loca.lt
echo.

rem 터널 실행
lt --port 3000 --subdomain insightreel-mobile-test

rem 터널이 종료되면 여기로 옴
echo.
echo [%time%] ❌ 터널이 종료되었습니다!
echo [%time%] ⏳ 5초 후 자동 재시작...
echo.

rem 5초 대기
timeout /t 5 /nobreak > nul

rem 다시 시작
goto restart