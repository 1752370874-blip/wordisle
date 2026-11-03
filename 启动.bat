@echo off
chcp 65001 >nul
title 单词本
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto nonode

node server.mjs

echo.
echo  服务已停止。按任意键关闭窗口。
pause >nul
exit /b 0

:nonode
echo.
echo  没有检测到 Node.js。
echo  你可以直接双击 index.html 打开使用，功能完全一样。
echo.
pause
exit /b 1
