"""
文件读取工具 - 支持读取不同格式的文件内容
用于简化版RAG系统中的文件内容提取
"""
import os
from typing import Optional, Dict, List


class FileReader:
    """文件读取器类"""
    
    # 支持的文本文件类型
    TEXT_FILE_TYPES = ['txt', 'md', 'json', 'csv', 'log']
    
    # 单个文件最大读取长度（避免token超限）
    MAX_FILE_LENGTH = 5000  # 字符数
    
    @staticmethod
    def read_file(file_path: str, file_type: str) -> Optional[str]:
        """
        读取文件内容
        
        Args:
            file_path: 文件路径
            file_type: 文件类型（如：txt, md, pdf）
            
        Returns:
            文件内容字符串，如果读取失败返回None
        """
        try:
            # 检查文件是否存在
            if not os.path.exists(file_path):
                print(f"文件不存在: {file_path}")
                return None
            
            # 根据文件类型选择读取方式
            file_type = file_type.lower()
            
            if file_type in FileReader.TEXT_FILE_TYPES:
                return FileReader._read_text_file(file_path)
            else:
                print(f"不支持的文件类型: {file_type}")
                return None
                
        except Exception as e:
            print(f"读取文件失败: {file_path}, 错误: {str(e)}")
            return None
    
    @staticmethod
    def _read_text_file(file_path: str) -> Optional[str]:
        """
        读取文本文件内容
        
        Args:
            file_path: 文件路径
            
        Returns:
            文件内容字符串
        """
        try:
            # 尝试多种编码
            encodings = ['utf-8', 'gbk', 'gb2312', 'latin-1']
            
            for encoding in encodings:
                try:
                    with open(file_path, 'r', encoding=encoding) as f:
                        content = f.read()
                        
                    # 限制文件长度
                    if len(content) > FileReader.MAX_FILE_LENGTH:
                        content = content[:FileReader.MAX_FILE_LENGTH] + "\n\n[注: 文件内容过长，已截断]"
                    
                    return content
                    
                except UnicodeDecodeError:
                    continue
            
            print(f"无法解码文件: {file_path}")
            return None
            
        except Exception as e:
            print(f"读取文本文件失败: {file_path}, 错误: {str(e)}")
            return None
    
    @staticmethod
    def read_multiple_files(file_info_list: List[Dict]) -> List[Dict]:
        """
        批量读取多个文件
        
        Args:
            file_info_list: 文件信息列表，每个元素包含 file_path 和 file_type
            
        Returns:
            文件内容列表，每个元素包含 file_name, file_type, content
        """
        results = []
        
        for file_info in file_info_list:
            file_path = file_info.get('file_path')
            file_type = file_info.get('file_type')
            file_name = file_info.get('file_name', '未知文件')
            
            content = FileReader.read_file(file_path, file_type)
            
            if content:
                results.append({
                    'file_name': file_name,
                    'file_type': file_type,
                    'content': content
                })
        
        return results
    
    @staticmethod
    def format_file_content_for_ai(file_contents: List[Dict]) -> str:
        """
        将文件内容格式化为适合AI提示词的格式
        
        Args:
            file_contents: 文件内容列表
            
        Returns:
            格式化后的字符串
        """
        if not file_contents:
            return ""
        
        formatted_text = "【参考文件内容】\n\n"
        
        for idx, file_info in enumerate(file_contents, 1):
            formatted_text += f"--- 文件 {idx}: {file_info['file_name']} ---\n"
            formatted_text += f"{file_info['content']}\n\n"
        
        return formatted_text


# 便捷函数
def read_file(file_path: str, file_type: str) -> Optional[str]:
    """读取单个文件的便捷函数"""
    return FileReader.read_file(file_path, file_type)


def read_multiple_files(file_info_list: List[Dict]) -> List[Dict]:
    """批量读取多个文件的便捷函数"""
    return FileReader.read_multiple_files(file_info_list)


def format_file_content_for_ai(file_contents: List[Dict]) -> str:
    """格式化文件内容用于AI提示词的便捷函数"""
    return FileReader.format_file_content_for_ai(file_contents)
