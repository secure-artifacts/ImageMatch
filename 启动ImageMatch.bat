@echo off
chcp 65001 >nul 2>&1
title ImageMatch - AI 图像相似度匹配

echo.
echo  ============================================================
echo   ImageMatch - AI 图像相似度匹配应用
echo  ============================================================
echo.
echo   正在启动服务器，请稍候...
echo   (首次启动需要下载模型，可能需要几分钟)
echo.
echo   启动后请访问: http://localhost:8000
echo  ============================================================
echo.

cd /d "%~dp0backend"

:: 检查虚拟环境是否存在
if not exist "venv\Scripts\python.exe" (
    echo [!] 虚拟环境未找到，正在创建...
    python -m venv venv
    echo [+] 正在安装依赖...
    venv\Scripts\pip.exe install torch torchvision --index-url https://download.pytorch.org/whl/cpu
    venv\Scripts\pip.exe install -r requirements.txt
    echo [OK] 依赖安装完成！
    echo.
)

:: 延迟 2 秒后打开浏览器
start "" cmd /c "timeout /t 5 /nobreak >nul && start http://localhost:8000"

:: 启动后端服务器
echo [*] 正在启动 ImageMatch 服务器...
echo.
echo  -----------------------------------------------------------
echo   关闭此窗口即可停止服务器
echo  -----------------------------------------------------------
echo.

venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000

pause
