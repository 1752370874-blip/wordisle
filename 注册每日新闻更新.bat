@echo off
chcp 65001 >nul
title 注册每日新闻更新任务
set "EXE=%LOCALAPPDATA%\Programs\词屿\WordIsle.exe"
if not exist "%EXE%" (
  echo 没有找到已安装的「词屿」：%EXE%
  echo 请先安装，再运行这个脚本。
  pause
  exit /b 1
)
schtasks /Create /TN "词屿-每日英语新闻" /TR "\"%EXE%\" --update-news" /SC DAILY /ST 07:30 /F
if errorlevel 1 (
  echo 创建计划任务失败，可以试试右键“以管理员身份运行”。
) else (
  echo 已创建计划任务：每天 07:30 自动更新英语新闻。
  echo 也可以在“任务计划程序”里删除或改时间。
)
pause
