"""
统一异常处理
"""
from fastapi import HTTPException, status
from typing import Optional


class BaseAPIException(HTTPException):
    """基础API异常类"""
    def __init__(
        self,
        status_code: int,
        detail: str,
        headers: Optional[dict] = None
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)


class NotFoundException(BaseAPIException):
    """资源不存在异常"""
    def __init__(self, resource: str, resource_id: Optional[int] = None):
        detail = f"{resource} not found"
        if resource_id is not None:
            detail = f"{resource} with id {resource_id} not found"
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail
        )


class BadRequestException(BaseAPIException):
    """请求参数错误异常"""
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )


class ConflictException(BaseAPIException):
    """资源冲突异常"""
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail
        )


class InternalServerException(BaseAPIException):
    """内部服务器错误异常"""
    def __init__(self, detail: str = "Internal server error"):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail
        )

