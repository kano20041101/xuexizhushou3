@echo off
echo 🚀 开始部署学习助手项目...

REM 检查Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 请先安装 Docker Desktop
    exit /b 1
)

REM 创建上传目录
if not exist "backend\uploads\avatars" mkdir "backend\uploads\avatars"
if not exist "backend\uploads\reference_files\post_images" mkdir "backend\uploads\reference_files\post_images"

REM 复制环境变量文件
if not exist ".env" (
    copy .env.example .env
    echo ⚠️  请编辑 .env 文件，配置数据库密码和API密钥
)

REM 构建并启动容器
echo 🐳 构建并启动容器...
docker-compose up -d --build

if %errorlevel% equ 0 (
    echo.
    echo ✅ 部署完成！
    echo 🌐 访问地址: http://localhost:80
    echo 📊 数据库: MySQL (端口 3306)
    echo 📝 查看日志: docker-compose logs -f
) else (
    echo ❌ 部署失败，请检查错误信息
)

pause
