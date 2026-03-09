@echo off
echo 🚀 CentOS 部署脚本
echo.

REM 检查是否以 root 用户运行
whoami | findstr "root" >nul
if %errorlevel% neq 0 (
    echo ❌ 请使用 root 用户运行此脚本
    pause
    exit /b 1
)

echo 📦 安装 Docker...
yum install -y yum-utils device-mapper-persistent-data lvm2
yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo 🚀 启动 Docker...
systemctl start docker
systemctl enable docker

echo 📦 克隆项目...
cd ~
if not exist xuexizhushou3 (
    git clone https://github.com/kano20041101/xuexizhushou3.git
)

cd xuexizhushou3

echo 📝 配置环境变量...
if not exist .env (
    copy .env.example .env
    echo ⚠️  请编辑 .env 文件，配置数据库密码
)

echo 🐳 启动服务...
chmod +x deploy.sh
./deploy.sh

echo.
echo ✅ 部署完成！
echo 🌐 访问地址: http://你的服务器IP
pause
