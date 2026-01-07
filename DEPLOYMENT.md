# 性能测试平台部署和启动指南

## 📋 目录

- [环境要求](#环境要求)
- [快速启动](#快速启动)
- [详细部署步骤](#详细部署步骤)
- [服务配置](#服务配置)
- [服务管理](#服务管理)
- [故障排除](#故障排除)

## 环境要求

### 系统要求
- **操作系统**: Linux / macOS / Windows (WSL2)
- **Docker**: 20.10+
- **Docker Compose**: 1.29+
- **内存**: 8GB+ 推荐
- **CPU**: 4核+ 推荐
- **磁盘**: 20GB+ 可用空间

### 端口要求
确保以下端口未被占用：
- `3000` - 前端服务
- `8000` - 后端API
- `3306` - MySQL数据库
- `6379` - Redis
- `8086` - InfluxDB
- `9000` - MinIO API
- `9001` - MinIO控制台

## 快速启动

### 一键启动（推荐）

```bash
# 1. 克隆项目
git clone <repository-url>
cd pfp

# 2. 启动所有服务
./start.sh

# 3. 访问平台
# 前端界面: http://localhost:3000
# 后端API: http://localhost:8000
# API文档: http://localhost:8000/docs
```

### 停止服务

```bash
docker-compose down
```

## 详细部署步骤

### 1. 环境准备

```bash
# 检查Docker和Docker Compose
docker --version
docker-compose --version

# 如果未安装，请先安装Docker和Docker Compose
```

### 2. 配置环境变量

```bash
# 复制环境配置模板
cp env.example .env

# 编辑配置文件（可选，默认配置已可用）
vim .env
```

主要配置项：
```env
# 数据库配置
MYSQL_SERVER=mysql
MYSQL_USER=root
MYSQL_PASSWORD=pfp123456
MYSQL_DB=pfp

# Redis配置
REDIS_HOST=redis
REDIS_PORT=6379

# InfluxDB配置
INFLUXDB_URL=http://influxdb:8086
INFLUXDB_TOKEN=your-token
INFLUXDB_ORG=pfp
INFLUXDB_BUCKET=performance_metrics

# MinIO配置
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=file-management
```

### 3. 创建必要目录

```bash
mkdir -p uploads logs
```

### 4. 启动服务

#### 方式一：使用启动脚本（推荐）

```bash
./start.sh
```

#### 方式二：使用Docker Compose

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 5. 验证服务

```bash
# 检查所有服务状态
docker-compose ps

# 检查服务健康状态
curl http://localhost:8000/health
curl http://localhost:3000
```

## 服务配置

### 服务列表

| 服务 | 端口 | 说明 | 访问地址 |
|------|------|------|----------|
| 前端 | 3000 | React前端应用 | http://localhost:3000 |
| 后端API | 8000 | FastAPI后端服务 | http://localhost:8000 |
| API文档 | 8000 | Swagger文档 | http://localhost:8000/docs |
| MySQL | 3306 | 主数据库 | localhost:3306 |
| Redis | 6379 | 缓存和消息队列 | localhost:6379 |
| InfluxDB | 8086 | 时序数据库 | http://localhost:8086 |
| MinIO API | 9000 | 对象存储API | http://localhost:9000 |
| MinIO控制台 | 9001 | 对象存储管理界面 | http://localhost:9001 |

### 默认账号

#### InfluxDB
- **用户名**: `admin`
- **密码**: `pfp123456`

#### MinIO
- **用户名**: `minioadmin`
- **密码**: `minioadmin`

### 数据库初始化

数据库表会在服务启动时自动创建，无需手动初始化。

## 服务管理

### 查看服务状态

```bash
# 查看所有服务状态
docker-compose ps

# 查看特定服务状态
docker-compose ps backend
docker-compose ps frontend
```

### 查看服务日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mysql
docker-compose logs -f redis
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend
docker-compose restart frontend
```

### 停止服务

```bash
# 停止所有服务（保留数据）
docker-compose stop

# 停止并删除容器（保留数据卷）
docker-compose down

# 停止并删除所有数据
docker-compose down -v
```

### 更新服务

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build
```

## 故障排除

### 常见问题

#### 1. 端口冲突

**问题**: 端口已被占用

**解决方案**:
```bash
# 检查端口占用
lsof -i :8000
lsof -i :3000

# 停止占用端口的进程或修改docker-compose.yml中的端口映射
```

#### 2. 内存不足

**问题**: 服务启动失败，内存不足

**解决方案**:
- 增加系统内存
- 关闭其他占用内存的应用
- 减少Docker容器的内存限制

#### 3. 数据库连接失败

**问题**: 后端无法连接数据库

**解决方案**:
```bash
# 检查数据库服务是否运行
docker-compose ps mysql

# 查看数据库日志
docker-compose logs mysql

# 重启数据库服务
docker-compose restart mysql
```

#### 4. MinIO连接失败

**问题**: 文件上传失败，MinIO连接错误

**解决方案**:
```bash
# 检查MinIO服务状态
docker-compose ps minio

# 查看MinIO日志
docker-compose logs minio

# 重启MinIO服务
docker-compose restart minio

# 手动初始化MinIO（如果需要）
docker exec -it minio-server mc admin info minio
```

#### 5. 前端无法访问后端API

**问题**: 前端页面显示API连接错误

**解决方案**:
```bash
# 检查后端服务是否运行
docker-compose ps backend

# 检查后端日志
docker-compose logs backend

# 验证后端API可访问性
curl http://localhost:8000/health
```

### 重置数据

如果需要重置所有数据：

```bash
# 停止所有服务并删除数据卷
docker-compose down -v

# 重新启动
docker-compose up -d
```

### 清理Docker资源

```bash
# 清理未使用的镜像和容器
docker system prune -a

# 清理数据卷（谨慎使用）
docker volume prune
```

## 开发模式部署

### 后端开发模式

```bash
cd backend

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/macOS
# 或
venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt

# 启动开发服务器
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 前端开发模式

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm start
```

### 启动依赖服务

开发模式下，仍需要启动数据库等依赖服务：

```bash
# 只启动依赖服务（MySQL、Redis、InfluxDB、MinIO）
docker-compose up -d mysql redis influxdb minio
```

## 生产环境部署

### 安全建议

1. **修改默认密码**
   - 修改所有服务的默认密码
   - 使用强密码策略

2. **配置HTTPS**
   - 使用Nginx反向代理配置SSL证书
   - 启用HTTPS访问

3. **防火墙配置**
   - 只开放必要的端口
   - 限制数据库和Redis的外部访问

4. **数据备份**
   - 定期备份MySQL数据
   - 备份MinIO存储的数据

### 性能优化

1. **资源限制**
   - 在docker-compose.yml中配置资源限制
   - 根据实际需求调整内存和CPU限制

2. **数据库优化**
   - 配置MySQL连接池大小
   - 优化数据库索引

3. **缓存策略**
   - 合理使用Redis缓存
   - 配置缓存过期时间

## 监控和维护

### 健康检查

```bash
# 检查服务健康状态
curl http://localhost:8000/health

# 检查所有服务状态
docker-compose ps
```

### 日志管理

```bash
# 查看实时日志
docker-compose logs -f

# 导出日志到文件
docker-compose logs > logs/app.log 2>&1
```

### 数据备份

```bash
# 备份MySQL数据
docker exec mysql-container mysqldump -u root -p pfp > backup.sql

# 备份MinIO数据
docker exec minio-server mc mirror /data /backup
```

## 技术支持

如遇到问题，请：
1. 查看服务日志：`docker-compose logs -f`
2. 检查服务状态：`docker-compose ps`
3. 参考项目README.md文档
4. 提交Issue到项目仓库

---

**最后更新**: 2024-01-01
**维护者**: 项目开发团队

