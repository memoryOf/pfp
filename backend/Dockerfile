FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libffi-dev \
    libssl-dev \
    default-libmysqlclient-dev \
    pkg-config \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    && rm -rf /var/lib/apt/lists/*

# 安装Docker客户端（用于在容器内运行Docker命令）
# 使用静态二进制文件方式安装最新版本，确保API版本兼容
# Docker客户端需要支持API 1.44+（对应Docker 25.0+）
RUN set -eux; \
    ARCH=$(dpkg --print-architecture); \
    if [ "$ARCH" = "amd64" ]; then \
        DOCKER_ARCH="x86_64"; \
    elif [ "$ARCH" = "arm64" ]; then \
        DOCKER_ARCH="aarch64"; \
    else \
        DOCKER_ARCH="$ARCH"; \
    fi; \
    # 尝试安装最新版本的Docker客户端（25.0+支持API 1.44+） \
    DOCKER_VERSION="25.0.5"; \
    if curl -fsSL "https://download.docker.com/linux/static/stable/${DOCKER_ARCH}/docker-${DOCKER_VERSION}.tgz" -o /tmp/docker.tgz; then \
        tar -xzC /tmp -f /tmp/docker.tgz && \
        mv /tmp/docker/docker /usr/local/bin/ && \
        chmod +x /usr/local/bin/docker && \
        rm -rf /tmp/docker /tmp/docker.tgz && \
        docker --version || true; \
    else \
        echo "Failed to download Docker ${DOCKER_VERSION}, trying latest version..."; \
        # 如果特定版本失败，尝试下载最新版本 \
        if curl -fsSL "https://download.docker.com/linux/static/stable/${DOCKER_ARCH}/docker-latest.tgz" -o /tmp/docker.tgz 2>/dev/null; then \
            tar -xzC /tmp -f /tmp/docker.tgz && \
            mv /tmp/docker/docker /usr/local/bin/ && \
            chmod +x /usr/local/bin/docker && \
            rm -rf /tmp/docker /tmp/docker.tgz && \
            docker --version || true; \
        else \
            echo "Failed to download Docker static binary, trying apt install..."; \
            curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg && \
            echo "deb [arch=${ARCH} signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
            apt-get update && \
            apt-get install -y docker-ce-cli && \
            rm -rf /var/lib/apt/lists/* && \
            docker --version || true; \
        fi; \
    fi

# 注意: Karate测试通过Docker运行，不需要在容器内安装Java或Karate
# Karate将通过 intuit/karate Docker镜像运行
# Docker socket需要挂载到容器中（在docker-compose.yml中配置）

# 复制依赖文件
COPY requirements.txt .

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 创建上传目录
RUN mkdir -p uploads

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
