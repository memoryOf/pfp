#!/usr/bin/env python3
"""
简单的API测试脚本
"""
import requests
import json

def test_file_management_api():
    """测试文件管理API"""
    base_url = "http://localhost:8000"
    
    print("🧪 测试文件管理API...")
    
    # 测试获取文件列表
    try:
        response = requests.get(f"{base_url}/api/v1/file-management/files?path=/")
        print(f"📁 获取文件列表 - 状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 成功获取文件列表")
            print(f"📊 响应数据: {json.dumps(data, indent=2, ensure_ascii=False)}")
        else:
            print(f"❌ 获取文件列表失败: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到后端服务，请确保后端服务正在运行")
        return False
    except Exception as e:
        print(f"❌ 测试失败: {str(e)}")
        return False
    
    return True

def test_health_check():
    """测试健康检查"""
    base_url = "http://localhost:8000"
    
    try:
        response = requests.get(f"{base_url}/health")
        print(f"🏥 健康检查 - 状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 服务健康: {data}")
            return True
        else:
            print(f"❌ 健康检查失败: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到后端服务")
        return False
    except Exception as e:
        print(f"❌ 健康检查失败: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 开始API测试...")
    print("=" * 50)
    
    # 测试健康检查
    if not test_health_check():
        print("❌ 后端服务未运行，请先启动后端服务")
        exit(1)
    
    print("=" * 50)
    
    # 测试文件管理API
    test_file_management_api()
    
    print("=" * 50)
    print("🏁 测试完成")










