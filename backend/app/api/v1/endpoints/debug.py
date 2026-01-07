"""
远程调试API
"""
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import Dict, List
from pydantic import BaseModel
import json
import logging

from ....core.database import get_db
from ....services.load_generator_service import LoadGeneratorService
from ....services.venv_service import VirtualEnvService
from ....services.remote_debug_service import RemoteDebugService

router = APIRouter()
logger = logging.getLogger(__name__)


class DebugConfig(BaseModel):
    users: int = 1
    duration: int = 30
    host: str = "http://localhost"
    spawn_rate: int = 1


class DebugStartRequest(BaseModel):
    load_generator_id: int
    deployment_id: str
    deployment_info: Dict
    debug_config: DebugConfig


class DebugStartResponse(BaseModel):
    debug_id: str
    status: str
    process_id: str
    log_file: str


@router.post("/test-tasks/{task_id}/debug/start/", response_model=DebugStartResponse)
async def start_debug(
    task_id: int,
    request: DebugStartRequest,
    db: Session = Depends(get_db)
):
    """启动远程调试"""
    try:
        logger.info(f"Starting debug for task {task_id}, load_generator {request.load_generator_id}")
        
        load_generator_service = LoadGeneratorService(db)
        venv_service = VirtualEnvService(load_generator_service)
        debug_service = RemoteDebugService(load_generator_service, venv_service)
        
        result = await debug_service.start_debug(
            task_id=task_id,
            load_generator_id=request.load_generator_id,
            deployment_info=request.deployment_info,
            debug_config=request.debug_config.dict()
        )
        
        if "error" in result:
            error_msg = result["error"]
            logger.error(f"Debug start failed: {error_msg}")
            # 根据错误类型返回不同的状态码
            if "not found" in error_msg.lower() or "不存在" in error_msg:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=error_msg
                )
            elif "timeout" in error_msg.lower() or "超时" in error_msg:
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail=error_msg
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=error_msg
                )
        
        logger.info(f"Debug started successfully: {result.get('debug_id')}")
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting debug: {str(e)}", exc_info=True)
        error_msg = str(e) if str(e) else repr(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"启动调试失败: {error_msg}"
        )


@router.post("/debug/{debug_id}/stop/")
async def stop_debug(
    debug_id: str,
    db: Session = Depends(get_db)
):
    """停止远程调试"""
    try:
        load_generator_service = LoadGeneratorService(db)
        venv_service = VirtualEnvService(load_generator_service)
        debug_service = RemoteDebugService(load_generator_service, venv_service)
        
        result = await debug_service.stop_debug(debug_id)
        
        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["error"]
            )
        
        return result
    
    except Exception as e:
        logger.error(f"Error stopping debug: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"停止调试失败: {str(e)}"
        )


@router.get("/debug/{debug_id}/status/")
async def get_debug_status(
    debug_id: str,
    db: Session = Depends(get_db)
):
    """获取调试状态"""
    try:
        load_generator_service = LoadGeneratorService(db)
        venv_service = VirtualEnvService(load_generator_service)
        debug_service = RemoteDebugService(load_generator_service, venv_service)
        
        result = await debug_service.get_debug_status(debug_id)
        
        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["error"]
            )
        
        return result
    
    except Exception as e:
        logger.error(f"Error getting debug status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取调试状态失败: {str(e)}"
        )


@router.websocket("/ws/debug/{debug_id}/logs")
async def websocket_debug_logs(websocket: WebSocket, debug_id: str):
    """WebSocket端点，实时传输调试日志"""
    await websocket.accept()
    logger.info(f"WebSocket connected for debug_id: {debug_id}")
    
    try:
        # 创建服务实例（这里需要传入db，但WebSocket不直接支持Depends）
        # 我们需要使用应用上下文或全局实例
        from ....core.database import SessionLocal
        db = SessionLocal()
        
        try:
            load_generator_service = LoadGeneratorService(db)
            venv_service = VirtualEnvService(load_generator_service)
            debug_service = RemoteDebugService(load_generator_service, venv_service)
            
            # 流式传输日志
            async for log_entry in debug_service.stream_debug_logs(debug_id):
                await websocket.send_json(log_entry)
            
        finally:
            db.close()
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for debug_id: {debug_id}")
    
    except Exception as e:
        logger.error(f"WebSocket error for debug_id {debug_id}: {str(e)}")
        try:
            await websocket.send_json({
                "timestamp": "error",
                "level": "ERROR",
                "message": f"Error: {str(e)}"
            })
        except:
            pass


@router.get("/debug/{debug_id}/logs/")
async def get_debug_logs(
    debug_id: str,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """获取调试日志（非实时）"""
    try:
        load_generator_service = LoadGeneratorService(db)
        venv_service = VirtualEnvService(load_generator_service)
        debug_service = RemoteDebugService(load_generator_service, venv_service)
        
        logs = []
        async for log_entry in debug_service.stream_debug_logs(debug_id, limit=limit):
            logs.append(log_entry)
        
        return {
            "debug_id": debug_id,
            "logs": logs,
            "count": len(logs)
        }
    
    except Exception as e:
        logger.error(f"Error getting debug logs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取调试日志失败: {str(e)}"
        )

