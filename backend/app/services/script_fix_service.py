"""
脚本修复服务 - 修复Locust脚本中的常见问题
"""
import re
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class ScriptFixService:
    """脚本修复服务"""
    
    @staticmethod
    def fix_assert_statements(script_content: str) -> Dict[str, any]:
        """
        修复脚本中的assert语句
        
        Args:
            script_content: 原始脚本内容
            
        Returns:
            {
                "fixed_content": str,  # 修复后的脚本
                "changes": List[str],   # 修改说明
                "fixed_count": int      # 修复的数量
            }
        """
        fixed_content = script_content
        changes = []
        fixed_count = 0
        
        # 模式1: assert response.status_code == XXX (通用模式，包括200)
        pattern1 = r'assert\s+response\.status_code\s*==\s*(\d+)'
        matches = list(re.finditer(pattern1, fixed_content))
        for match in reversed(matches):  # 从后往前替换，避免位置偏移
            expected_code = match.group(1)
            start, end = match.span()
            # 计算缩进
            line_start = fixed_content.rfind('\n', 0, start) + 1
            indent = fixed_content[line_start:start]
            
            replacement = (
                f'if response.status_code != {expected_code}:\n'
                f'{indent}    response.failure(f"Expected status code {expected_code}, got {{response.status_code}}")'
            )
            fixed_content = (
                fixed_content[:start] +
                replacement +
                fixed_content[end:]
            )
            changes.append(f"Replaced 'assert response.status_code == {expected_code}' with proper error handling")
            fixed_count += 1
        
        # 模式2: assert response.status_code != XXX
        pattern2 = r'assert\s+response\.status_code\s*!=\s*(\d+)'
        matches = list(re.finditer(pattern2, fixed_content))
        for match in reversed(matches):
            unexpected_code = match.group(1)
            start, end = match.span()
            # 计算缩进
            line_start = fixed_content.rfind('\n', 0, start) + 1
            indent = fixed_content[line_start:start]
            
            replacement = (
                f'if response.status_code == {unexpected_code}:\n'
                f'{indent}    response.failure(f"Unexpected status code {unexpected_code}")'
            )
            fixed_content = (
                fixed_content[:start] +
                replacement +
                fixed_content[end:]
            )
            changes.append(f"Replaced 'assert response.status_code != {unexpected_code}' with proper error handling")
            fixed_count += 1
        
        return {
            "fixed_content": fixed_content,
            "changes": changes,
            "fixed_count": fixed_count
        }
    
    @staticmethod
    def fix_common_issues(script_content: str) -> Dict[str, any]:
        """
        修复脚本中的常见问题
        
        Args:
            script_content: 原始脚本内容
            
        Returns:
            {
                "fixed_content": str,
                "changes": List[str],
                "fixed_count": int
            }
        """
        result = ScriptFixService.fix_assert_statements(script_content)
        
        # 可以添加更多修复逻辑
        # 例如：添加缺失的导入、修复缩进等
        
        return result

