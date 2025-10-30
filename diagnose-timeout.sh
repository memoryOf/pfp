#!/bin/bash

# 504超时问题诊断脚本
echo "🔍 504 Gateway Timeout 问题诊断"
echo "=================================="

# 检查Docker服务状态
echo "📊 Docker服务状态："
docker-compose ps

echo ""
echo "🌐 网络连接测试："
# 测试前端连接
echo "前端服务 (3000端口):"
curl -I --connect-timeout 5 http://localhost:3000 2>/dev/null || echo "❌ 前端服务不可达"

# 测试后端连接
echo "后端服务 (8000端口):"
curl -I --connect-timeout 5 http://localhost:8000 2>/dev/null || echo "❌ 后端服务不可达"

# 测试Nginx代理
echo "Nginx代理 (80端口):"
curl -I --connect-timeout 5 http://localhost 2>/dev/null || echo "❌ Nginx代理不可达"

echo ""
echo "🔧 Nginx配置检查："
docker exec pfp-nginx nginx -t 2>/dev/null || echo "❌ Nginx配置有误"

echo ""
echo "📋 当前超时配置："
echo "Nginx代理超时设置："
docker exec pfp-nginx cat /etc/nginx/nginx.conf | grep -E "(proxy_.*timeout|client_.*timeout)" || echo "❌ 未找到超时配置"

echo ""
echo "💾 数据库连接测试："
docker exec pfp-mysql mysql -u pfp -ppfp123456 -e "SELECT 1;" 2>/dev/null && echo "✅ 数据库连接正常" || echo "❌ 数据库连接失败"

echo ""
echo "🗄️ MinIO连接测试："
curl -I --connect-timeout 5 http://localhost:9000/minio/health/live 2>/dev/null && echo "✅ MinIO服务正常" || echo "❌ MinIO服务异常"

echo ""
echo "📈 系统资源使用："
echo "内存使用："
free -h
echo "磁盘使用："
df -h

echo ""
echo "🔍 最近错误日志："
echo "Nginx错误日志："
docker logs pfp-nginx --tail 10 2>/dev/null | grep -i error || echo "无Nginx错误"

echo "后端错误日志："
docker logs pfp-backend --tail 10 2>/dev/null | grep -i error || echo "无后端错误"

echo ""
echo "✅ 诊断完成！"
echo "如果仍有504错误，请检查："
echo "1. 后端服务是否正常响应"
echo "2. 数据库连接是否稳定"
echo "3. MinIO服务是否可用"
echo "4. 网络连接是否正常"


