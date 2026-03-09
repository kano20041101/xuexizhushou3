# CentOS/RHEL 系统部署指南

## 🚀 快速部署（CentOS）

### 1. 安装 Docker

```bash
# 卸载旧版本（如果有）
yum remove docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-engine

# 安装依赖
yum install -y yum-utils device-mapper-persistent-data lvm2

# 添加 Docker 仓库
yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 安装 Docker
yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 启动 Docker
systemctl start docker
systemctl enable docker

# 验证安装
docker --version
docker compose version
```

### 2. 安装 Git

```bash
yum install -y git
```

### 3. 克隆项目

```bash
cd ~
git clone https://github.com/kano20041101/xuexizhushou3.git
cd xuexizhushou3
```

### 4. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件
nano .env
```

需要修改的配置：
```env
DATABASE_URL=mysql+pymysql://root:你的密码@db:3306/llm_learning_assistant?charset=utf8mb4
DASHSCOPE_API_KEY=sk-469f5b0ca72a4bfdbaec573bf52cca82
```

### 5. 启动服务

```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 🔧 如果你使用宝塔面板

### 1. 通过宝塔终端执行

在宝塔面板的"终端"中执行上述命令。

### 2. 或使用宝塔的 Docker 管理器

1. 在宝塔面板安装 "Docker 管理器"
2. 上传项目文件
3. 使用 docker-compose 部署

---

## 🛠️ 常用命令

```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 更新项目
git pull
docker-compose up -d --build
```

---

## 🌐 防火墙配置

```bash
# 开放端口
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --reload

# 或者关闭防火墙（不推荐生产环境）
systemctl stop firewalld
systemctl disable firewalld
```

---

## 📊 检查部署状态

```bash
# 查看所有容器
docker ps -a

# 查看日志
docker-compose logs backend
docker-compose logs frontend
docker-compose logs db

# 测试访问
curl http://localhost
```

---

## ❓ 常见问题

### 1. Docker 服务无法启动

```bash
# 检查 Docker 状态
systemctl status docker

# 查看日志
journalctl -xeu docker
```

### 2. 端口被占用

```bash
# 查看端口占用
netstat -tulpn | grep :80
netstat -tulpn | grep :3306

# 修改 docker-compose.yml 中的端口映射
```

### 3. 权限问题

```bash
# 将当前用户添加到 docker 组
usermod -aG docker $USER

# 重新登录或执行
newgrp docker
```

---

## 📝 宝塔面板额外配置

如果使用宝塔面板，还需要：

1. **安全组配置**：在阿里云控制台开放 80、443 端口
2. **宝塔防火墙**：在宝塔面板的"安全"中开放 80、443 端口
3. **域名解析**：将域名 A 记录指向服务器 IP

---

**部署完成后，访问 http://你的服务器IP 即可使用！**
