"""
性能测试平台主应用
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
from .core.config import settings
from .core.database import engine, Base
from .api.v1.endpoints.load_generators import router as load_generators_router
from .api.v1.endpoints.test_tasks import router as test_tasks_router
from .api.v1.endpoints.test_scripts import router as test_scripts_router
from .api.v1.endpoints.test_strategies import router as test_strategies_router
from .api.v1.endpoints.test_scenarios import router as test_scenarios_router
from .api.v1.endpoints.test_executions import router as test_executions_router
from .api.v1.endpoints.scenario_files import router as scenario_files_router
from .api.v1.endpoints.scenarios import router as scenarios_router
from .api.v1.endpoints.heartbeat import router as heartbeat_router
from .services.minio_init import init_minio


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时执行
    print("🚀 启动性能测试平台...")
    
    # 创建数据库表
    Base.metadata.create_all(bind=engine)
    print("✅ 数据库表创建完成")
    
    # 初始化MinIO
    if init_minio():
        print("✅ MinIO初始化完成")
    else:
        print("❌ MinIO初始化失败")
    
    yield
    
    # 关闭时执行
    print("🛑 关闭性能测试平台...")


# 创建FastAPI应用
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="基于Locust的企业级性能测试平台",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应该设置具体的域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 添加受信任主机中间件
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]  # 生产环境应该设置具体的主机
)


# 全局异常处理
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """全局异常处理器"""
    return JSONResponse(
        status_code=500,
        content={
            "error": "内部服务器错误",
            "message": str(exc),
            "path": str(request.url)
        }
    )


# 健康检查端点
@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "timestamp": "2024-01-01T00:00:00Z"
    }


# 根路径
@app.get("/")
async def root():
    """根路径"""
    return {
        "message": f"欢迎使用{settings.APP_NAME}",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "api": settings.API_V1_STR
    }


# 注册API路由
app.include_router(
    load_generators_router,
    prefix=f"{settings.API_V1_STR}/load-generators",
    tags=["压测机管理"]
)

app.include_router(
    test_tasks_router,
    prefix=f"{settings.API_V1_STR}/test-tasks",
    tags=["测试任务管理"]
)

app.include_router(
    test_scripts_router,
    prefix=f"{settings.API_V1_STR}/test-scripts",
    tags=["测试脚本管理"]
)

app.include_router(
    test_strategies_router,
    prefix=f"{settings.API_V1_STR}/test-strategies",
    tags=["压测策略管理"]
)

app.include_router(
    test_scenarios_router,
    prefix=f"{settings.API_V1_STR}/test-scenarios",
    tags=["测试场景管理"]
)

app.include_router(
    test_executions_router,
    prefix=f"{settings.API_V1_STR}/test-executions",
    tags=["测试执行管理"]
)

app.include_router(
    scenario_files_router,
    prefix=f"{settings.API_V1_STR}/scenario-files",
    tags=["场景文件管理"]
)

app.include_router(
    scenarios_router,
    prefix=f"{settings.API_V1_STR}/scenarios",
    tags=["场景管理"]
)

app.include_router(
    heartbeat_router,
    prefix=f"{settings.API_V1_STR}/heartbeat",
    tags=["心跳检测"]
)


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info"
    )
