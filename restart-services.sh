#!/bin/bash

# 重启服务脚本 - 解决504超时问题
echo "🔄 重启服务以应用504超时修复..."

# 停止所有服务
echo "⏹️  停止所有服务..."
docker-compose down

# 清理网络和卷（可选）
echo "🧹 清理Docker资源..."
docker system prune -f

# 重新构建并启动服务
echo "🚀 重新构建并启动服务..."
docker-compose up --build -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 30

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose ps

# 检查Nginx配置
echo "🔧 检查Nginx配置..."
docker exec pfp-nginx nginx -t

# 检查后端健康状态
echo "💚 检查后端健康状态..."
curl -f http://localhost/health || echo "❌ 后端健康检查失败"

echo "✅ 服务重启完成！"
echo "📝 修复内容："
echo "   - Nginx代理超时设置：60-120秒"
echo "   - 前端API超时：60-120秒"
echo "   - 数据库连接池优化"
echo "   - 文件上传大小限制：100MB"
echo ""
echo "🌐 访问地址："
echo "   - 前端：http://localhost"
echo "   - 后端API：http://localhost/api/v1"
echo "   - API文档：http://localhost/docs"


