@echo off
echo 🚀 盘古AI内容引擎 启动中...
echo.

cd /d E:\盘古AI内容引擎

:: 检查 node_modules
if not exist "node_modules\" (
    echo 📦 首次运行，安装依赖...
    npm install
)

:: 检查环境变量
if not exist ".env" (
    echo ⚠️ 未检测到 .env 文件
    echo 📝 请复制 .env.example 为 .env 并填入 DeepSeek API Key
    copy .env.example .env
    echo.
)

:: 启动服务
echo ✨ 启动引擎...
node server/index.js

pause
