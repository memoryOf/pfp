# 企业级性能测试平台 (PFP - Performance Testing Platform)

基于Locust的企业级性能测试平台v1.0，专注于单机模式压测，提供完整的测试管理、执行、监控和报告功能。

## 🚀 功能特性

### 核心功能
- 🖥️ **单机压测模式**: 支持1台压测机配置1个Master和多个Worker
- 📊 **实时监控**: 实时性能指标监控和可视化
- 📈 **详细报告**: 丰富的测试报告和数据分析
- 🔧 **灵活配置**: 支持多种测试场景和策略配置
- 📱 **现代界面**: 响应式Web管理界面

### 高级功能
- 🤖 **AI智能脚本生成**: 基于自然语言描述自动生成Locust脚本
- 🔄 **AI脚本优化**: 智能优化现有Locust脚本
- 📋 **精确资源管理**: 核心级别的资源分配和监控
- ⚙️ **配置约束验证**: 严格的配置规则和验证机制

## 🛠️ 技术栈

### 后端
- **FastAPI**: 高性能Python Web框架
- **MySQL**: 主数据库（替换PostgreSQL）
- **Redis**: 缓存和消息队列
- **InfluxDB**: 时序数据存储
- **Celery**: 异步任务队列
- **Locust**: 性能测试引擎

### 前端
- **React**: 现代化前端框架
- **Ant Design**: 企业级UI组件库
- **ECharts**: 数据可视化图表
- **TypeScript**: 类型安全的JavaScript

### 基础设施
- **Docker**: 容器化部署
- **Docker Compose**: 服务编排
- **Nginx**: 反向代理

## 📁 项目结构

```
pfp/
├── backend/                 # 后端服务
│   ├── app/                # 应用代码
│   │   ├── api/            # API路由
│   │   │   └── v1/         # API v1版本
│   │   │       └── endpoints/  # 具体端点
│   │   ├── core/           # 核心配置
│   │   ├── models/         # 数据模型
│   │   ├── schemas/        # Pydantic模式
│   │   ├── services/       # 业务逻辑
│   │   └── utils/          # 工具函数
│   ├── tests/              # 测试代码
│   ├── requirements.txt    # Python依赖
│   └── Dockerfile          # Docker配置
├── frontend/               # 前端应用
│   ├── src/                # 源代码
│   │   ├── components/     # React组件
│   │   ├── pages/          # 页面组件
│   │   ├── services/       # API服务
│   │   ├── types/          # TypeScript类型
│   │   └── utils/          # 工具函数
│   ├── package.json        # Node.js依赖
│   └── Dockerfile          # Docker配置
├── locust/                 # Locust测试脚本
│   ├── scripts/            # 测试脚本
│   └── configs/            # 配置文件
├── docker/                 # Docker配置
├── docs/                   # 文档
├── docker-compose.yml      # 服务编排
├── start.sh               # 启动脚本
└── env.example            # 环境配置示例
```

## 🚀 快速开始

### 环境要求
- Docker & Docker Compose
- 8GB+ 内存
- 4核+ CPU

### 一键启动

1. 克隆项目
```bash
git clone <repository-url>
cd pfp
```

2. 启动服务
```bash
./start.sh
```

3. 访问平台
- 前端界面: http://localhost:3000
- 后端API: http://localhost:8000
- API文档: http://localhost:8000/docs
- InfluxDB: http://localhost:8086

### 手动启动

1. 配置环境变量
```bash
cp env.example .env
# 编辑 .env 文件配置相关参数
```

2. 启动服务
```bash
docker-compose up -d
```

3. 查看服务状态
```bash
docker-compose ps
```

## 📋 使用指南

### 1. 压测机管理
- 添加压测机：配置主机信息、硬件规格
- 测试连接：验证SSH连接和系统信息
- 资源监控：实时查看CPU、内存使用情况

### 2. 压测机配置
- 选择配置模式：1 Master + N Worker
- 资源分配：精确到核心级别的资源分配
- 配置验证：自动验证配置的有效性

### 3. 测试任务管理
- 创建测试任务：配置测试参数和策略
- 脚本管理：上传、编辑、AI生成Locust脚本
- 执行监控：实时查看测试执行状态

### 4. AI智能功能
- 脚本生成：描述API接口，自动生成Locust脚本
- 脚本优化：基于需求优化现有脚本

## 🔧 配置说明

### 压测机配置约束
- 必须有且仅有1个Master
- 所有Worker必须持有相同的核心数
- 核心分配必须为整数（不支持小数）
- 必须为系统预留至少1个核心

### 8核16GB机器配置示例
```
配置选项1: 1 Master + 1 Worker (高并发)
- Master: 1核, 2GB
- Worker-1: 6核, 13GB
- 系统预留: 1核, 1GB

配置选项2: 1 Master + 2 Worker (均衡负载) - 推荐
- Master: 1核, 2GB
- Worker-1: 3核, 7GB
- Worker-2: 3核, 7GB
- 系统预留: 1核, 1GB
```

## 🛑 停止服务

```bash
docker-compose down
```

## 📊 监控和日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

## 🔍 故障排除

### 常见问题
1. **端口冲突**: 检查3306、6379、8086、8000、3000端口是否被占用
2. **内存不足**: 确保系统有足够内存运行所有服务
3. **权限问题**: 确保Docker有足够权限访问项目目录

### 重置数据
```bash
docker-compose down -v
docker-compose up -d
```

## 📚 开发指南

详细的开发指南请参考：
- [需求文档v1.0](需求文档_v1.0.md)
- [AI智能脚本生成功能设计](AI智能脚本生成功能设计.md)
- [压测机资源管理功能设计](压测机资源管理功能设计.md)
- [压测机配置约束规则设计](压测机配置约束规则设计.md)

## 📄 许可证

MIT License