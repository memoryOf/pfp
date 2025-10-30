# MinIO文件上传系统部署指南

## 🚀 快速启动

### 1. 启动MinIO服务

```bash
# 使用提供的脚本启动MinIO
./start-minio.sh
```

或者手动启动：

```bash
# 使用Docker启动MinIO
docker run -d \
  --name minio-server \
  -p 9000:9000 \
  -p 9001:9001 \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  -v minio-data:/data \
  minio/minio server /data --console-address ":9001"
```

### 2. 启动后端服务

```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. 启动前端服务

```bash
cd frontend
npm start
```

## 🔧 配置说明

### MinIO配置
- **API地址**: http://localhost:9000
- **控制台地址**: http://localhost:9001
- **用户名**: minioadmin
- **密码**: minioadmin
- **存储桶**: file-management

### 后端配置
- **API地址**: http://localhost:8000
- **API文档**: http://localhost:8000/docs
- **数据库**: SQLite (app.db)

### 前端配置
- **开发服务器**: http://localhost:3000
- **文件管理页面**: http://localhost:3000/file-management

## 📁 文件上传流程

1. **前端选择文件** → 调用 `/api/v1/file-management/upload`
2. **后端接收文件** → 生成唯一文件名 → 上传到MinIO
3. **保存文件元数据** → 存储到数据库
4. **返回成功响应** → 前端刷新文件列表

## 🗂️ 目录结构

```
backend/
├── app/
│   ├── api/v1/endpoints/
│   │   └── file_management.py      # 文件管理API
│   ├── core/
│   │   ├── minio_client.py         # MinIO客户端
│   │   └── config.py               # 配置文件
│   ├── models/
│   │   └── file_management.py      # 数据模型
│   ├── schemas/
│   │   └── file_management.py      # Pydantic模式
│   └── services/
│       └── file_management_service.py # 服务层
└── alembic/versions/
    └── 001_create_file_items.py    # 数据库迁移
```

## 🔍 API接口

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/v1/file-management/upload` | 上传文件 |
| GET | `/api/v1/file-management/files` | 获取文件列表 |
| GET | `/api/v1/file-management/files/{id}` | 获取文件信息 |
| GET | `/api/v1/file-management/files/{id}/download` | 下载文件 |
| DELETE | `/api/v1/file-management/files/{id}` | 删除文件 |
| PUT | `/api/v1/file-management/files/{id}` | 更新文件信息 |

## 🐛 故障排除

### 1. 404 Not Found错误
- 确保后端服务正在运行 (http://localhost:8000)
- 检查API路由是否正确注册
- 验证前端代理配置

### 2. MinIO连接失败
- 确保MinIO服务正在运行
- 检查MinIO配置 (endpoint, access_key, secret_key)
- 验证网络连接

### 3. 数据库错误
- 确保数据库表已创建
- 检查数据库连接配置
- 运行数据库迁移

### 4. 文件上传失败
- 检查文件大小限制
- 验证文件类型是否允许
- 确保MinIO存储桶存在

## 📊 监控和日志

### 后端日志
```bash
# 查看后端日志
tail -f backend/logs/app.log
```

### MinIO日志
```bash
# 查看MinIO容器日志
docker logs minio-server
```

### 前端控制台
- 打开浏览器开发者工具
- 查看Network标签页的API请求
- 检查Console标签页的错误信息

## 🔒 安全注意事项

1. **生产环境配置**:
   - 修改默认的MinIO用户名和密码
   - 使用HTTPS连接
   - 设置适当的CORS策略

2. **文件安全**:
   - 验证文件类型和大小
   - 扫描恶意文件
   - 设置访问权限

3. **API安全**:
   - 实现身份认证
   - 使用API密钥
   - 限制请求频率

## 🚀 生产部署

### Docker Compose部署
```yaml
version: '3.8'
services:
  minio:
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    volumes:
      - minio-data:/data
    command: server /data --console-address ":9001"

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      MINIO_ENDPOINT: minio:9000
      MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY}
      MINIO_SECRET_KEY: ${MINIO_SECRET_KEY}
    depends_on:
      - minio

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      REACT_APP_API_URL: http://backend:8000
    depends_on:
      - backend

volumes:
  minio-data:
```

## 📞 技术支持

如果遇到问题，请检查：
1. 所有服务是否正常运行
2. 配置文件是否正确
3. 网络连接是否正常
4. 日志文件中的错误信息



