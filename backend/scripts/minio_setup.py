#!/usr/bin/env python3
"""
MinIO设置脚本
用于创建bucket和设置权限
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.minio_init import init_minio
from app.core.logger import logger


def main():
    """主函数"""
    print("🔧 开始设置MinIO...")
    
    if init_minio():
        print("✅ MinIO设置完成！")
        print(f"📦 Bucket: scenario-files")
        print(f"🌐 管理界面: http://localhost:9001")
        print(f"👤 用户名: pfpadmin")
        print(f"🔑 密码: pfp123456")
    else:
        print("❌ MinIO设置失败！")
        sys.exit(1)


if __name__ == "__main__":
    main()




