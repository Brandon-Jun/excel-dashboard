@echo off
chcp 65001 > nul
cd /d "%~dp0"
title 엑셀 대시보드

where node > nul 2>&1
if errorlevel 1 (
  echo [오류] Node.js가 설치되어 있지 않습니다. https://nodejs.org 에서 설치 후 다시 실행해주세요.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [1/2] 패키지를 설치합니다. 처음 한 번만 실행됩니다...
  call npm install
  if errorlevel 1 (
    echo [오류] 패키지 설치에 실패했습니다.
    pause
    exit /b 1
  )
)

echo [2/2] 대시보드를 실행합니다. 브라우저가 자동으로 열립니다.
echo       종료하려면 이 창에서 Ctrl+C 를 누르세요.
call npm run dev -- --open
pause
