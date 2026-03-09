#!/bin/bash

echo "🚀 CentOS 部署脚本"

# 检查是否以 root 用户运行
if [ "$(id -u)" != "0" ]; then
    echo "❌ 请使用 root 用户运行此脚本"
    exit 1
fi

# 安装 Docker
echo "📦 安装 Docker..."
yum install -y yum-utils device-mapper-persistent-data lvm2
yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 启动 Docker
echo "🚀 启动 Docker..."
systemctl start docker
systemctl enable docker

# 克隆项目
echo "📦 克隆项目..."
cd ~
if [ ! -d "xuexizhushou3" ]; then
    git clone https://github.com/kano20041101/xuexizhushou3.git
fi

cd xuexizhushou3

# 配置环境变量
echo "📝 配置环境变量..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  请编辑 .env 文件，配置数据库密码"
fi

# 启动服务
echo "🐳 启动服务..."
chmod +x deploy.sh
./deploy.sh

echo ""
echo "✅ 部署完成！"
echo "🌐 访问地址: http://你的服务器IP"
