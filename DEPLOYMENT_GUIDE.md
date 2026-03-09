# 🚀 阿里云轻量服务器部署指南

## 📋 准备工作

### 1. 登录服务器
```bash
ssh root@101.37.156.226
```

### 2. 更新系统
```bash
apt update && apt upgrade -y
```

### 3. 安装 Docker
```bash
# 安装依赖
apt install -y ca-certificates curl gnupg

# 添加 Docker 官方 GPG 密钥
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 添加 Docker 仓库
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 启动 Docker
systemctl start docker
systemctl enable docker

# 验证安装
docker --version
docker compose version
```

### 4. 配置防火墙
```bash
# 开放必要端口
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw enable
```

## 📦 部署步骤

### 1. 上传项目到服务器
```bash
# 在本地打包项目
# Windows PowerShell
Compress-Archive -Path * -DestinationPath xuexizhushou.zip

# 或使用 SCP 上传
scp -r xuexizhushou.zip root@101.37.156.226:~/
```

### 2. 解压并进入项目目录
```bash
cd ~
unzip xuexizhushou.zip
cd xuexizhushou
```

### 3. 配置环境变量
```bash
# 复制示例配置
cp .env.example .env

# 编辑配置文件
nano .env
```

需要修改的配置：
```env
# 数据库配置（使用 docker-compose 中的数据库服务）
DATABASE_URL=mysql+pymysql://root:你的密码@db:3306/llm_learning_assistant?charset=utf8mb4

# 阿里云百炼 API Key（保持不变）
DASHSCOPE_API_KEY=sk-469f5b0ca72a4bfdbaec573bf52cca82
```

### 4. 启动服务
```bash
# 赋予部署脚本执行权限
chmod +x deploy.sh

# 运行部署脚本
./deploy.sh
```

### 5. 验证部署
```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 访问项目
curl http://localhost
```

## 🔧 常用命令

### 查看服务状态
```bash
docker-compose ps
```

### 查看日志
```bash
# 所有服务日志
docker-compose logs -f

# 单个服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### 重启服务
```bash
docker-compose restart
```

### 停止服务
```bash
docker-compose down
```

### 重新部署
```bash
docker-compose up -d --build
```

### 备份数据库
```bash
docker exec xuexizhushou_db mysqldump -u root -p你的密码 llm_learning_assistant > backup.sql
```

### 恢复数据库
```bash
docker exec -i xuexizhushou_db mysql -u root -p你的密码 llm_learning_assistant < backup.sql
```

## 🌐 域名配置（可选）

如果需要绑定域名：

### 1. 在阿里云控制台配置 DNS
```
A记录: your-domain.com -> 101.37.156.226
```

### 2. 修改 nginx 配置
编辑 `frontend/nginx.conf`，将 `server_name localhost;` 改为 `server_name your-domain.com;`

### 3. 重启服务
```bash
docker-compose restart nginx
```

## 🛡️ 安全建议

### 1. 修改默认密码
```bash
# 修改 MySQL root 密码
docker exec -it xuexizhushou_db mysql -u root -p
ALTER USER 'root'@'%' IDENTIFIED BY '新密码';
FLUSH PRIVILEGES;
EXIT;
```

### 2. 配置 SSL 证书（使用 Let's Encrypt）
```bash
# 安装 Certbot
apt install -y certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d your-domain.com

# 自动续期
systemctl enable certbot.timer
```

### 3. 定期备份
```bash
# 创建备份脚本
nano /usr/local/bin/backup.sh

#!/bin/bash
docker exec xuexizhushou_db mysqldump -u root -p密码 llm_learning_assistant > /backup/backup_$(date +%Y%m%d).sql
find /backup -name "backup_*.sql" -mtime +7 -delete
```

## 📊 监控和维护

### 查看资源使用情况
```bash
docker stats
```

### 清理无用容器和镜像
```bash
docker system prune -a
```

### 更新项目
```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build
```

## ❓ 常见问题

### 1. 端口被占用
```bash
# 查看端口占用
netstat -tulpn | grep :80

# 修改 docker-compose.yml 中的端口映射
```

### 2. 数据库连接失败
```bash
# 检查数据库容器状态
docker-compose ps db

# 查看数据库日志
docker-compose logs db
```

### 3. 前端无法访问
```bash
# 检查前端构建
docker-compose logs frontend

# 重新构建前端
docker-compose build frontend
docker-compose up -d frontend nginx
```

## 📞 获取帮助

如果遇到问题，可以查看日志或检查配置文件。

---

**恭喜！你的项目已经成功部署到阿里云轻量服务器！** 🎉

访问 http://你的服务器IP 即可使用。
