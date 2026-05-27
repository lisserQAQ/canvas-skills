@echo off
echo ========================================
echo   Canvas Sandbox - 快速启动脚本
echo ========================================
echo.

REM 检查 node_modules 是否存在
if not exist "node_modules\" (
    echo [1/3] 首次运行，正在安装依赖...
    call npm install
    echo.
) else (
    echo [1/3] 依赖已安装 ✓
)

REM 检查 dist 目录是否存在
if not exist "dist\" (
    echo [2/3] 正在编译 TypeScript...
    call npm run build
    echo.
) else (
    echo [2/3] 代码已编译 ✓
)

echo [3/3] 启动服务器...
echo.
echo ========================================
echo   服务器地址: http://localhost:12345
echo   按 Ctrl+C 停止服务器
echo ========================================
echo.

call npm start
