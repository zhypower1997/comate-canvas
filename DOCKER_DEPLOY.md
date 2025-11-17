# Hackson Docker 部署指南

## 概述

本文档详细说明了如何将 Hackson Next.js 项目部署到 Docker 容器中，包括本地部署和宝塔面板部署两种方式。

## 项目结构

```
hackson/
├── Dockerfile              # Docker 镜像构建文件
├── .dockerignore           # Docker 构建忽略文件
├── docker-compose.yml      # Docker Compose 配置文件
├── build.sh               # 构建脚本
├── deploy.sh              # 部署脚本
├── next.config.ts         # Next.js 配置（已启用 standalone 输出）
└── ...                    # 其他项目文件
```

## 前置要求

### 本地环境
- Docker Desktop 或 Docker Engine
- Docker Compose
- Git

### 服务器环境
- 宝塔面板
- Docker 管理器插件
- Nginx

## 本地部署

### 1. 克隆项目
```bash
git clone <your-repository-url>
cd hackson
```

### 2. 构建镜像
```bash
# 给脚本执行权限
chmod +x build.sh deploy.sh

# 构建 Docker 镜像
./build.sh
```

### 3. 启动容器
```bash
# 使用部署脚本（推荐）
./deploy.sh

# 或直接使用 docker-compose
docker compose up -d
```

### 4. 验证部署
```bash
# 检查容器状态
docker compose ps

# 查看日志
docker compose logs -f

# 访问应用
curl http://localhost:3000
```

## 宝塔面板部署

### 1. 安装 Docker 管理器

1. 登录宝塔面板
2. 进入 **软件商店**
3. 搜索并安装 **Docker 管理器**
4. 等待安装完成

### 2. 上传项目文件

#### 方法一：通过宝塔文件管理器
1. 在宝塔面板中进入 **文件**
2. 导航到 `/www/wwwroot/`
3. 创建目录 `hackson`
4. 上传项目文件到该目录

#### 方法二：通过 Git 克隆
```bash
# SSH 连接到服务器
ssh root@your-server-ip

# 进入网站目录
cd /www/wwwroot/

# 克隆项目
git clone <your-repository-url> hackson
cd hackson
```

### 3. 构建 Docker 镜像

#### 方法一：使用宝塔面板 Docker 管理器
1. 进入 **Docker 管理器**
2. 点击 **镜像管理** → **构建镜像**
3. 选择项目目录：`/www/wwwroot/hackson`
4. 镜像名称：`hackson`
5. 标签：`latest`
6. 点击 **开始构建**

#### 方法二：使用命令行
```bash
# 进入项目目录
cd /www/wwwroot/hackson

# 给脚本执行权限
chmod +x build.sh deploy.sh

# 构建镜像
./build.sh
```

### 4. 创建并启动容器

#### 方法一：使用宝塔面板
1. 进入 **Docker 管理器** → **容器管理**
2. 点击 **添加容器**
3. 配置参数：
   - **镜像**：`hackson:latest`
   - **容器名称**：`hackson-app`
   - **端口映射**：`3000:3000`
   - **重启策略**：`unless-stopped`
   - **环境变量**：
     ```
     NODE_ENV=production
     NEXT_TELEMETRY_DISABLED=1
     ```
4. 点击 **提交**

#### 方法二：使用 Docker Compose
```bash
# 启动容器
./deploy.sh

# 或直接使用 docker-compose
docker compose up -d
```

### 5. 配置 Nginx 反向代理

1. 在宝塔面板中进入 **网站**
2. 添加站点或编辑现有站点
3. 点击 **设置** → **反向代理**
4. 添加代理：
   - **代理名称**：`hackson`
   - **目标URL**：`http://127.0.0.1:3000`
5. 点击 **提交**

#### Nginx 配置示例
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 静态资源缓存
    location /_next/static/ {
        proxy_cache_valid 200 302 10m;
        proxy_cache_valid 404 1m;
        proxy_pass http://127.0.0.1:3000;
    }
}
```

### 6. 配置 SSL 证书（可选）

1. 在宝塔面板中进入 **网站**
2. 选择你的站点
3. 点击 **SSL**
4. 选择证书类型并配置
5. 开启 **强制 HTTPS**

## 常用操作命令

### 容器管理
```bash
# 查看容器状态
docker compose ps

# 查看容器日志
docker compose logs -f hackson

# 重启容器
docker compose restart

# 停止容器
docker compose down

# 进入容器
docker exec -it hackson-app sh
```

### 镜像管理
```bash
# 查看镜像
docker images hackson

# 删除镜像
docker rmi hackson:latest

# 重新构建镜像
docker compose build --no-cache
```

### 更新部署
```bash
# 拉取最新代码
git pull origin main

# 重新构建并部署
./deploy.sh
```

## 故障排除

### 常见问题

#### 1. 容器启动失败
```bash
# 查看详细错误信息
docker compose logs hackson

# 检查端口占用
netstat -tlnp | grep 3000

# 检查镜像是否存在
docker images | grep hackson
```

#### 2. 应用无法访问
```bash
# 检查容器状态
docker compose ps

# 检查端口映射
docker port hackson-app

# 测试容器内部访问
docker exec hackson-app wget -qO- http://localhost:3000
```

#### 3. 构建失败
```bash
# 清理 Docker 缓存
docker system prune -a

# 重新构建
docker compose build --no-cache
```

### 日志查看
```bash
# 实时查看日志
docker compose logs -f

# 查看最近 100 行日志
docker compose logs --tail=100

# 查看错误日志
docker compose logs | grep ERROR
```

## 性能优化

### 1. 资源限制
在 `docker-compose.yml` 中添加资源限制：
```yaml
services:
  hackson:
    # ... 其他配置
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
        reservations:
          memory: 512M
          cpus: '0.25'
```

### 2. 多实例部署
```yaml
services:
  hackson:
    # ... 其他配置
    deploy:
      replicas: 3
```

### 3. 健康检查
```yaml
services:
  hackson:
    # ... 其他配置
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## 监控和维护

### 1. 系统监控
```bash
# 查看容器资源使用
docker stats hackson-app

# 查看系统资源
htop
```

### 2. 日志轮转
在宝塔面板中配置日志轮转：
1. 进入 **计划任务**
2. 添加定时任务清理日志

### 3. 备份策略
```bash
# 备份容器数据
docker commit hackson-app hackson-backup:$(date +%Y%m%d)

# 导出镜像
docker save hackson:latest > hackson-backup.tar
```

## 安全建议

1. **定期更新镜像**：使用最新的 Node.js 基础镜像
2. **非 root 用户**：Dockerfile 中已配置使用 nextjs 用户
3. **环境变量**：敏感信息通过环境变量传递
4. **网络隔离**：使用 Docker 网络隔离容器
5. **资源限制**：设置内存和 CPU 限制防止资源耗尽

## 联系支持

如果在部署过程中遇到问题，请：

1. 查看本文档的故障排除部分
2. 检查容器日志获取详细错误信息
3. 确认服务器环境满足前置要求
4. 联系技术支持并提供详细的错误信息

---

**文档版本**：v1.0  
**最后更新**：2024年12月  
**维护者**：Hackson 开发团队
