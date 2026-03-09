import requests
from bs4 import BeautifulSoup

# 获取阿里云百炼平台的官方文档
url = "https://help.aliyun.com/zh/model-studio/user-guide/application-calling"
response = requests.get(url)

if response.status_code == 200:
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # 搜索Python SDK相关内容
    python_sdk_section = soup.find(text=lambda text: text and 'Python SDK' in text)
    if python_sdk_section:
        # 获取包含Python SDK内容的段落
        parent = python_sdk_section.parent
        print("Python SDK 相关文档:")
        print(parent.text)
        
        # 获取后续几个段落
        for i in range(5):
            next_sibling = parent.find_next_sibling(['p', 'div', 'ul'])
            if next_sibling:
                parent = next_sibling
                print(next_sibling.text)
            else:
                break
    else:
        print("未找到Python SDK相关内容")
else:
    print(f"获取文档失败: {response.status_code}")
