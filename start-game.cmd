@echo off
cd /d "%~dp0"
title Thanh Van Son - Local Server

where python >nul 2>nul
if errorlevel 1 (
  echo Khong tim thay Python. Hay cai Python hoac chay lenh: py -m http.server 8000
  pause
  exit /b 1
)

echo Dang chay game tai http://localhost:8000
echo Giu cua so nay mo trong khi choi. Nhan Ctrl+C de dung game.
python serve_game.py
