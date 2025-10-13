#!/bin/bash

# 性能测试平台启动脚本

echo "🚀 启动性能测试平台..."

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose未安装，请先安装Docker Compose"
    exit 1
fi

# 检查环境配置文件
if [ ! -f .env ]; then
    echo "📝 创建环境配置文件..."
    cp env.example .env
    echo "✅ 请编辑 .env 文件配置相关参数"
fi

# 创建必要的目录
echo "📁 创建必要的目录..."
mkdir -p uploads
mkdir -p logs

# 启动服务
echo "🐳 启动Docker服务..."
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose ps

echo ""
echo "✅ 性能测试平台启动完成！"
echo ""
echo "📊 访问地址："
echo "   前端界面: http://localhost:3000"
echo "   后端API: http://localhost:8000"
echo "   API文档: http://localhost:8000/docs"
echo "   InfluxDB: http://localhost:8086"
echo "   MinIO管理界面: http://localhost:9001"
echo "   MinIO API: http://localhost:9000"
echo ""
echo "📝 默认账号："
echo "   InfluxDB: admin / pfp123456"
echo "   MinIO: admin / pfp123456"
echo ""
echo "🛑 停止服务: docker-compose down"
echo "📋 查看日志: docker-compose logs -f"