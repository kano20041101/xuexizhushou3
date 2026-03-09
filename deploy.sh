#!/bin/bash

echo "🚀 开始部署学习助手项目..."

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 请先安装 Docker"
    exit 1
fi

# 检查docker-compose是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "❌ 请先安装 Docker Compose"
    exit 1
fi

# 创建上传目录
mkdir -p backend/uploads/avatars
mkdir -p backend/uploads/reference_files/post_images

# 复制环境变量文件
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  请编辑 .env 文件，配置数据库密码和API密钥"
fi

# 构建并启动容器
echo "🐳 构建并启动容器..."
docker-compose up -d --build

echo "✅ 部署完成！"
echo "🌐 访问地址: http://localhost:80"
echo "📊 数据库: MySQL (端口 3306)"
echo "📝 查看日志: docker-compose logs -f"
