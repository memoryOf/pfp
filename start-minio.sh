#!/bin/bash

# 启动MinIO的脚本
echo "🚀 启动MinIO对象存储服务..."

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker未运行，请先启动Docker"
    exit 1
fi

# 检查MinIO容器是否已存在
if docker ps -a --format 'table {{.Names}}' | grep -q "minio-server"; then
    echo "📦 MinIO容器已存在，正在启动..."
    docker start minio-server
else
    echo "📦 创建并启动MinIO容器..."
    docker run -d \
        --name minio-server \
        -p 9000:9000 \
        -p 9001:9001 \
        -e "MINIO_ROOT_USER=minioadmin" \
        -e "MINIO_ROOT_PASSWORD=minioadmin" \
        -v minio-data:/data \
        minio/minio server /data --console-address ":9001"
fi

# 等待MinIO启动
echo "⏳ 等待MinIO启动..."
sleep 5

# 检查MinIO是否正常运行
if curl -s http://localhost:9000/minio/health/live > /dev/null; then
    echo "✅ MinIO启动成功！"
    echo "🌐 MinIO API: http://localhost:9000"
    echo "🎛️  MinIO控制台: http://localhost:9001"
    echo "👤 用户名: minioadmin"
    echo "🔑 密码: minioadmin"
else
    echo "❌ MinIO启动失败，请检查日志"
    docker logs minio-server
    exit 1
fi

echo ""
echo "📋 下一步操作："
echo "1. 启动后端服务: cd backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo "2. 启动前端服务: cd frontend && npm start"
echo "3. 访问文件管理页面: http://localhost:3000/file-management"










