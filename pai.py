import requests
from bs4 import BeautifulSoup
import os
from urllib.parse import urljoin, urlparse

# 1. 设置目标网页 URL
url = "http://localhost:8086/orgs/c9f43c6f5ac7c31c"  # 替换为你想爬的网页

# 2. 设置请求头（伪装成浏览器，避免被反爬）
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# 3. 发送请求获取网页内容
try:
    response = requests.get(url, headers=headers)
    response.raise_for_status()  # 检查请求是否成功
    response.encoding = response.apparent_encoding  # 自动识别编码
except requests.RequestException as e:
    print(f"请求失败: {e}")
    exit()

# 4. 解析 HTML
soup = BeautifulSoup(response.text, 'html.parser')

# 5. 找出所有 <img> 标签
img_tags = soup.find_all('img')

# 6. 创建保存图片的文件夹
os.makedirs('downloaded_images', exist_ok=True)

# 7. 提取并下载图片
for idx, img in enumerate(img_tags):
    # 获取图片链接（优先 src，考虑 data-src 等懒加载）
    img_url = img.get('src') or img.get('data-src') or img.get('data-original')
    if not img_url:
        continue  # 跳过没有 src 的图片

    # 处理相对路径，转为绝对 URL
    img_url = urljoin(url, img_url)

    # 获取文件名（从 URL 中提取）
    parsed_url = urlparse(img_url)
    filename = os.path.basename(parsed_url.path)
    if not filename or '.' not in filename:
        filename = f"image_{idx}.jpg"  # 默认命名

    filepath = os.path.join('downloaded_images', filename)

    # 下载图片
    try:
        img_data = requests.get(img_url, headers=headers, timeout=10)
        img_data.raise_for_status()

        # 保存图片
        with open(filepath, 'wb') as f:
            f.write(img_data.content)
        print(f"✅ 下载成功: {filename} <- {img_url}")
    except Exception as e:
        print(f"❌ 下载失败: {filename} ({e})")

print("🎉 图片爬取完成！")