"""
虚拟环境管理服务
"""
import paramiko
import logging
from typing import Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class VirtualEnvService:
    """虚拟环境管理服务"""
    
    # 虚拟环境配置
    VENV_BASE_PATH = "/opt/pfp-locust"
    VENV_PATH = "/opt/pfp-locust/venv"
    REQUIREMENTS_FILE = "/opt/pfp-locust/venv/requirements.txt"
    
    def __init__(self, load_generator_service):
        self.load_generator_service = load_generator_service
    
    async def ensure_venv_exists(self, load_generator_id: int) -> Dict[str, Any]:
        """
        确保虚拟环境存在且可用
        
        Returns:
            {
                "exists": bool,
                "created": bool,
                "status": "ok" | "created" | "error",
                "python_version": str,
                "locust_version": str,
                "message": str
            }
        """
        load_generator = await self.load_generator_service.get_load_generator(load_generator_id)
        if not load_generator:
            return {"error": "Load generator not found"}
        
        ssh_client = self.load_generator_service._get_ssh_client(load_generator)
        
        try:
            # 检查虚拟环境状态
            check_result = await self._check_venv_status(ssh_client)
            
            if check_result["status"] == "ok":
                # 虚拟环境存在且可用
                ssh_client.close()
                return {
                    "exists": True,
                    "created": False,
                    "status": "ok",
                    "python_version": check_result["python_version"],
                    "locust_version": check_result["locust_version"],
                    "message": "Virtual environment is ready"
                }
            
            # 需要创建虚拟环境
            logger.info(f"Creating virtual environment on {load_generator.host}")
            create_result = await self._create_venv(ssh_client)
            
            if create_result["success"]:
                # 验证创建结果
                verify_result = await self._check_venv_status(ssh_client)
                
                ssh_client.close()
                
                if verify_result["status"] == "ok":
                    return {
                        "exists": True,
                        "created": True,
                        "status": "created",
                        "python_version": verify_result["python_version"],
                        "locust_version": verify_result["locust_version"],
                        "message": "Virtual environment created successfully"
                    }
                else:
                    return {
                        "exists": False,
                        "created": False,
                        "status": "error",
                        "message": "Virtual environment created but verification failed"
                    }
            else:
                ssh_client.close()
                return {
                    "exists": False,
                    "created": False,
                    "status": "error",
                    "message": create_result["error"]
                }
        
        except Exception as e:
            logger.error(f"Error ensuring venv: {str(e)}")
            try:
                ssh_client.close()
            except:
                pass
            return {
                "exists": False,
                "created": False,
                "status": "error",
                "message": f"Failed to ensure virtual environment: {str(e)}"
            }
    
    async def _check_venv_status(self, ssh_client: paramiko.SSHClient) -> Dict:
        """检查虚拟环境状态"""
        # 先检查默认路径，如果不存在则检查用户主目录
        check_script = f"""
#!/bin/bash
set +e

VENV_PATH="{self.VENV_PATH}"

# 如果默认路径不存在，尝试用户主目录
if [ ! -d "$VENV_PATH" ]; then
    HOME_DIR=$(eval echo ~$USER)
    if [ -z "$HOME_DIR" ] || [ "$HOME_DIR" = "~$USER" ]; then
        HOME_DIR=$HOME
    fi
    ALTERNATIVE_VENV_PATH="$HOME_DIR/pfp-locust/venv"
    
    if [ -d "$ALTERNATIVE_VENV_PATH" ]; then
        VENV_PATH="$ALTERNATIVE_VENV_PATH"
        echo "VENV_PATH=$VENV_PATH"
    else
        echo "VENV_NOT_EXISTS"
        exit 1
    fi
fi

if [ ! -f "$VENV_PATH/bin/activate" ]; then
    echo "VENV_INVALID"
    exit 1
fi

if ! "$VENV_PATH/bin/python3" --version > /dev/null 2>&1; then
    echo "VENV_PYTHON_INVALID"
    exit 1
fi

if ! "$VENV_PATH/bin/locust" --version > /dev/null 2>&1; then
    echo "VENV_LOCUST_MISSING"
    exit 1
fi

PYTHON_VERSION=$("$VENV_PATH/bin/python3" --version 2>&1 | cut -d' ' -f2)
LOCUST_VERSION=$("$VENV_PATH/bin/locust" --version 2>&1 | cut -d' ' -f2)

echo "VENV_OK|$PYTHON_VERSION|$LOCUST_VERSION"
"""
        
        try:
            stdin, stdout, stderr = ssh_client.exec_command(check_script)
            exit_status = stdout.channel.recv_exit_status()
            output = stdout.read().decode().strip()
            error = stderr.read().decode().strip()
            
            # 检查是否有新的 VENV_PATH
            new_venv_path = None
            for line in output.split("\n"):
                if line.startswith("VENV_PATH="):
                    new_venv_path = line.split("=", 1)[1]
                    break
            
            if exit_status == 0 and output.startswith("VENV_OK"):
                # 如果使用了备用路径，更新类变量
                if new_venv_path and new_venv_path != self.VENV_PATH:
                    logger.info(f"Using alternative venv path: {new_venv_path}")
                    self.VENV_PATH = new_venv_path
                    self.VENV_BASE_PATH = "/".join(new_venv_path.split("/")[:-1])
                    self.REQUIREMENTS_FILE = f"{new_venv_path}/requirements.txt"
                
                parts = output.split("|")
                return {
                    "status": "ok",
                    "python_version": parts[1] if len(parts) > 1 else "unknown",
                    "locust_version": parts[2] if len(parts) > 2 else "unknown"
                }
            else:
                return {
                    "status": "missing",
                    "reason": output or error
                }
        except Exception as e:
            logger.error(f"Error checking venv status: {str(e)}")
            return {
                "status": "error",
                "reason": str(e)
            }
    
    async def _create_venv(self, ssh_client: paramiko.SSHClient) -> Dict:
        """创建虚拟环境"""
        create_script = f"""
#!/bin/bash
set +e

VENV_BASE="{self.VENV_BASE_PATH}"
VENV_PATH="{self.VENV_PATH}"
REQUIREMENTS="{self.REQUIREMENTS_FILE}"

# 尝试创建基础目录，如果失败则使用用户主目录
if ! mkdir -p "$VENV_BASE" 2>/dev/null; then
    # 如果 /opt 目录没有权限，使用用户主目录
    HOME_DIR=$(eval echo ~$USER)
    if [ -z "$HOME_DIR" ] || [ "$HOME_DIR" = "~$USER" ]; then
        HOME_DIR=$HOME
    fi
    VENV_BASE="$HOME_DIR/pfp-locust"
    VENV_PATH="$HOME_DIR/pfp-locust/venv"
    REQUIREMENTS="$HOME_DIR/pfp-locust/venv/requirements.txt"
    
    # 更新类变量（通过环境变量传递）
    export VENV_BASE_PATH="$VENV_BASE"
    export VENV_PATH="$VENV_PATH"
    
    mkdir -p "$VENV_BASE" || {{
        echo "ERROR: Cannot create directory: $VENV_BASE"
        exit 1
    }}
fi

# 如果虚拟环境已存在但损坏，先删除
if [ -d "$VENV_PATH" ]; then
    echo "Removing existing virtual environment..."
    rm -rf "$VENV_PATH"
fi

# 检查并安装必要的依赖
echo "Checking Python venv support..."

# 检查 python3-venv 是否可用（通过尝试创建临时虚拟环境）
TEMP_VENV_TEST="/tmp/venv_test_$$"
if python3 -m venv "$TEMP_VENV_TEST" > /dev/null 2>&1; then
    rm -rf "$TEMP_VENV_TEST"
    VENV_AVAILABLE=true
else
    rm -rf "$TEMP_VENV_TEST" 2>/dev/null
    VENV_AVAILABLE=false
fi

# 如果 python3-venv 不可用，尝试安装
if [ "$VENV_AVAILABLE" = "false" ]; then
    echo "python3-venv module not available, attempting to install..."
    
    # 获取 Python 版本信息
    PYTHON_VERSION_FULL=$(python3 --version 2>&1)
    PYTHON_VERSION=$(echo "$PYTHON_VERSION_FULL" | awk '{{print $2}}' | cut -d. -f1,2)
    PYTHON_MAJOR=$(echo "$PYTHON_VERSION" | cut -d. -f1)
    PYTHON_MINOR=$(echo "$PYTHON_VERSION" | cut -d. -f2)
    
    # 检测包管理器并安装 python3-venv
    if command -v apt-get > /dev/null 2>&1; then
        # Debian/Ubuntu
        echo "Detected apt package manager, installing python3-venv..."
        if sudo -n true 2>/dev/null; then
            sudo apt-get update -qq
            # 尝试安装特定版本的 python3-venv，如果失败则安装通用版本
            if [ -n "$PYTHON_MAJOR" ] && [ -n "$PYTHON_MINOR" ]; then
                PYTHON_VENV_PKG="python${{PYTHON_MAJOR}}.${{PYTHON_MINOR}}-venv"
                sudo apt-get install -y "$PYTHON_VENV_PKG" 2>/dev/null || sudo apt-get install -y python3-venv 2>/dev/null
            else
                sudo apt-get install -y python3-venv 2>/dev/null
            fi
        else
            echo "WARNING: sudo access required to install python3-venv"
            echo "Please run: sudo apt-get install -y python3-venv"
        fi
    elif command -v yum > /dev/null 2>&1; then
        # CentOS/RHEL
        echo "Detected yum package manager, installing python3-venv..."
        if sudo -n true 2>/dev/null; then
            sudo yum install -y python3-venv 2>/dev/null
        else
            echo "WARNING: sudo access required to install python3-venv"
        fi
    elif command -v dnf > /dev/null 2>&1; then
        # Fedora
        echo "Detected dnf package manager, installing python3-venv..."
        if sudo -n true 2>/dev/null; then
            sudo dnf install -y python3-venv 2>/dev/null
        else
            echo "WARNING: sudo access required to install python3-venv"
        fi
    else
        echo "WARNING: Unknown package manager, cannot auto-install python3-venv"
    fi
fi

# 尝试使用 virtualenv 作为备选方案
if ! python3 -m venv "$VENV_PATH" 2>/dev/null; then
    echo "python3 -m venv failed, trying virtualenv..."
    
    VIRTUALENV_CMD=""
    
    # 检查 virtualenv 是否已安装
    if command -v virtualenv > /dev/null 2>&1; then
        VIRTUALENV_CMD="virtualenv"
        echo "Found virtualenv in PATH"
    elif [ -f ~/.local/bin/virtualenv ]; then
        VIRTUALENV_CMD="$HOME/.local/bin/virtualenv"
        echo "Found virtualenv in ~/.local/bin"
    else
        echo "virtualenv not found, attempting to install..."
        
        # 首先检查并尝试安装 pip（如果需要）
        PIP_AVAILABLE=false
        if command -v pip3 > /dev/null 2>&1; then
            PIP_AVAILABLE=true
            echo "Found pip3"
        elif command -v pip > /dev/null 2>&1; then
            PIP_AVAILABLE=true
            echo "Found pip"
        elif python3 -m pip --version > /dev/null 2>&1; then
            PIP_AVAILABLE=true
            echo "Found python3 -m pip"
        else
            echo "pip not found, attempting to install pip..."
            
            # 首先尝试使用 ensurepip 模块（Python 内置，不需要下载）
            echo "Attempting to install pip using ensurepip module..."
            if python3 -m ensurepip --user 2>&1; then
                PIP_AVAILABLE=true
                echo "pip installed successfully using ensurepip"
            elif python3 -m ensurepip --upgrade --user 2>&1; then
                PIP_AVAILABLE=true
                echo "pip installed successfully using ensurepip --upgrade"
            else
                echo "ensurepip not available, trying get-pip.py..."
                
                # 尝试使用 get-pip.py 安装 pip（使用 --break-system-packages 或 --user）
                if command -v curl > /dev/null 2>&1; then
                    echo "Downloading get-pip.py using curl..."
                    curl -sSL https://bootstrap.pypa.io/get-pip.py -o /tmp/get-pip.py 2>&1
                    if [ -f /tmp/get-pip.py ]; then
                        # 先尝试 --user，如果失败则尝试 --break-system-packages（仅用于用户目录）
                        if python3 /tmp/get-pip.py --user 2>&1; then
                            PIP_AVAILABLE=true
                            echo "pip installed successfully using get-pip.py --user"
                        elif python3 /tmp/get-pip.py --user --break-system-packages 2>&1; then
                            PIP_AVAILABLE=true
                            echo "pip installed successfully using get-pip.py --user --break-system-packages"
                        else
                            echo "WARNING: get-pip.py installation failed"
                        fi
                        rm -f /tmp/get-pip.py
                    fi
                elif command -v wget > /dev/null 2>&1; then
                    echo "Downloading get-pip.py using wget..."
                    wget -q -O /tmp/get-pip.py https://bootstrap.pypa.io/get-pip.py 2>&1
                    if [ -f /tmp/get-pip.py ]; then
                        if python3 /tmp/get-pip.py --user 2>&1; then
                            PIP_AVAILABLE=true
                            echo "pip installed successfully using get-pip.py --user"
                        elif python3 /tmp/get-pip.py --user --break-system-packages 2>&1; then
                            PIP_AVAILABLE=true
                            echo "pip installed successfully using get-pip.py --user --break-system-packages"
                        else
                            echo "WARNING: get-pip.py installation failed"
                        fi
                        rm -f /tmp/get-pip.py
                    fi
                fi
            fi
            
            # 如果仍然没有 pip，尝试使用系统包管理器安装
            if [ "$PIP_AVAILABLE" = "false" ]; then
                if command -v apt-get > /dev/null 2>&1; then
                    echo "Attempting to install pip using apt-get..."
                    if sudo -n true 2>/dev/null; then
                        sudo apt-get update -qq
                        sudo apt-get install -y python3-pip 2>&1
                        if command -v pip3 > /dev/null 2>&1; then
                            PIP_AVAILABLE=true
                            echo "pip installed successfully using apt-get"
                        fi
                    else
                        echo "WARNING: sudo required to install pip via apt-get"
                    fi
                fi
            fi
        fi
        
        # 尝试使用 pip 安装 virtualenv（不需要 sudo）
        INSTALL_SUCCESS=false
        if [ "$PIP_AVAILABLE" = "true" ]; then
            if command -v pip3 > /dev/null 2>&1; then
                echo "Installing virtualenv using pip3..."
                if pip3 install --user virtualenv 2>&1; then
                    INSTALL_SUCCESS=true
                elif pip3 install --user --break-system-packages virtualenv 2>&1; then
                    INSTALL_SUCCESS=true
                elif python3 -m pip install --user virtualenv 2>&1; then
                    INSTALL_SUCCESS=true
                elif python3 -m pip install --user --break-system-packages virtualenv 2>&1; then
                    INSTALL_SUCCESS=true
                else
                    echo "WARNING: pip3 install failed, trying alternative methods..."
                fi
            elif command -v pip > /dev/null 2>&1; then
                echo "Installing virtualenv using pip..."
                if pip install --user virtualenv 2>&1; then
                    INSTALL_SUCCESS=true
                elif pip install --user --break-system-packages virtualenv 2>&1; then
                    INSTALL_SUCCESS=true
                elif python3 -m pip install --user virtualenv 2>&1; then
                    INSTALL_SUCCESS=true
                elif python3 -m pip install --user --break-system-packages virtualenv 2>&1; then
                    INSTALL_SUCCESS=true
                else
                    echo "WARNING: pip install failed"
                fi
            elif python3 -m pip --version > /dev/null 2>&1; then
                echo "Installing virtualenv using python3 -m pip..."
                if python3 -m pip install --user virtualenv 2>&1; then
                    INSTALL_SUCCESS=true
                elif python3 -m pip install --user --break-system-packages virtualenv 2>&1; then
                    INSTALL_SUCCESS=true
                else
                    echo "WARNING: python3 -m pip install failed"
                fi
            fi
            
            if [ "$INSTALL_SUCCESS" = "true" ]; then
                echo "virtualenv installation completed"
            fi
        else
            echo "ERROR: pip not available and cannot be installed automatically"
            echo "Please install pip manually:"
            echo "  For Debian/Ubuntu: sudo apt-get install -y python3-pip"
            echo "  Or download and run: curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py && python3 get-pip.py --user"
        fi
        
        # 再次检查 virtualenv 是否可用
        if command -v virtualenv > /dev/null 2>&1; then
            VIRTUALENV_CMD="virtualenv"
            echo "virtualenv installed successfully in PATH"
        elif [ -f ~/.local/bin/virtualenv ]; then
            VIRTUALENV_CMD="$HOME/.local/bin/virtualenv"
            echo "virtualenv installed successfully in ~/.local/bin"
        fi
    fi
    
    # 尝试使用 virtualenv 创建虚拟环境
    if [ -n "$VIRTUALENV_CMD" ]; then
        echo "Creating virtual environment using $VIRTUALENV_CMD..."
        if "$VIRTUALENV_CMD" -p python3 "$VENV_PATH" 2>&1; then
            echo "Virtual environment created successfully using virtualenv"
        elif python3 -m virtualenv "$VENV_PATH" 2>&1; then
            echo "Virtual environment created successfully using python3 -m virtualenv"
        else
            echo "ERROR: Failed to create virtual environment using virtualenv"
            exit 1
        fi
    else
        echo "ERROR: Failed to install or locate virtualenv"
        echo "Please install virtualenv manually:"
        echo "  pip3 install --user virtualenv"
        echo "Or install python3-venv (requires sudo):"
        echo "  sudo apt-get install -y python3-venv"
        exit 1
    fi
fi

# 验证虚拟环境是否创建成功
if [ ! -d "$VENV_PATH" ] || [ ! -f "$VENV_PATH/bin/activate" ]; then
    echo "ERROR: Virtual environment was not created successfully"
    exit 1
fi

# 激活虚拟环境并安装依赖
source "$VENV_PATH/bin/activate" || {{
    echo "ERROR: Failed to activate virtual environment"
    exit 1
}}

echo "Upgrading pip..."
pip install --upgrade pip --quiet || {{
    echo "WARNING: Failed to upgrade pip, continuing..."
}}

echo "Installing Locust..."
pip install locust --quiet || {{
    echo "ERROR: Failed to install Locust"
    exit 1
}}

# 保存依赖版本
pip freeze > "$REQUIREMENTS_FILE" || {{
    echo "WARNING: Failed to save requirements file"
}}

echo "Virtual environment created successfully at $VENV_PATH"
echo "VENV_PATH=$VENV_PATH"
"""
        
        try:
            stdin, stdout, stderr = ssh_client.exec_command(create_script)
            
            # 实时读取输出（用于日志）
            output_lines = []
            error_lines = []
            
            while True:
                line = stdout.readline()
                if not line:
                    break
                output_lines.append(line.strip())
            
            while True:
                line = stderr.readline()
                if not line:
                    break
                error_lines.append(line.strip())
            
            exit_status = stdout.channel.recv_exit_status()
            
            # 检查输出中是否有新的 VENV_PATH
            new_venv_path = None
            for line in output_lines:
                if line.startswith("VENV_PATH="):
                    new_venv_path = line.split("=", 1)[1]
                    break
            
            if exit_status == 0:
                # 如果使用了备用路径，更新类变量
                if new_venv_path and new_venv_path != self.VENV_PATH:
                    logger.info(f"Using alternative venv path: {new_venv_path}")
                    self.VENV_PATH = new_venv_path
                    self.VENV_BASE_PATH = "/".join(new_venv_path.split("/")[:-1])
                    self.REQUIREMENTS_FILE = f"{new_venv_path}/requirements.txt"
                
                return {
                    "success": True,
                    "output": "\n".join(output_lines),
                    "venv_path": new_venv_path or self.VENV_PATH
                }
            else:
                error_msg = "\n".join(error_lines) if error_lines else "\n".join(output_lines) or "Unknown error"
                logger.error(f"Failed to create venv: {error_msg}")
                return {
                    "success": False,
                    "error": error_msg
                }
        
        except Exception as e:
            logger.error(f"Exception creating venv: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

