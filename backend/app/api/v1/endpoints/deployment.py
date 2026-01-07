"""
脚本部署API
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from ....core.database import get_db
from ....services.load_generator_service import LoadGeneratorService
from ....services.venv_service import VirtualEnvService
from ....services.script_deployment_service import ScriptDeploymentService

router = APIRouter()


class DeploymentRequest(BaseModel):
    load_generator_id: int
    scenario_ids: List[int]
    target_dir: Optional[str] = None
    deployment_mode: str = "overwrite"  # "overwrite" or "incremental"


class DeploymentResponse(BaseModel):
    deployment_id: str
    status: str
    files: List[dict]
    venv_status: dict
    validation: dict
    logs: List[str]
    target_dir: str


@router.post("/test-tasks/{task_id}/deploy/", response_model=DeploymentResponse)
async def deploy_scripts(
    task_id: int,
    request: DeploymentRequest,
    db: Session = Depends(get_db)
):
    """部署脚本到压测机"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # 验证请求参数
        if not request.scenario_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="场景ID列表不能为空"
            )
        
        load_generator_service = LoadGeneratorService(db)
        venv_service = VirtualEnvService(load_generator_service)
        deployment_service = ScriptDeploymentService(
            load_generator_service,
            venv_service,
            db
        )
        
        result = await deployment_service.deploy_scripts(
            task_id=task_id,
            load_generator_id=request.load_generator_id,
            scenario_ids=request.scenario_ids,
            target_dir=request.target_dir,
            deployment_mode=request.deployment_mode
        )
        
        if "error" in result:
            logger.error(f"Deployment error: {result['error']}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result["error"]
            )
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Deployment failed with exception: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"部署失败: {str(e)}"
        )


@router.get("/test-tasks/{task_id}/deployment-status/{deployment_id}/")
async def get_deployment_status(
    task_id: int,
    deployment_id: str,
    db: Session = Depends(get_db)
):
    """获取部署状态（目前返回基本信息，后续可扩展）"""
    return {
        "deployment_id": deployment_id,
        "task_id": task_id,
        "status": "completed",
        "message": "Deployment completed"
    }

