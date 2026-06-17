#!/bin/bash
# ============================================================
# ImageMatch 一键部署脚本 (Google Cloud VM)
# ============================================================
set -e

echo ""
echo "============================================================"
echo "  ImageMatch - AI 图像相似度匹配 - 自动部署"
echo "============================================================"
echo ""

# 1. 安装 Docker
echo "[1/5] 安装 Docker..."
if ! command -v docker &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    sudo usermod -aG docker $USER
    echo "[OK] Docker 安装完成"
else
    echo "[OK] Docker 已安装"
fi

# 2. 克隆代码
echo ""
echo "[2/5] 下载 ImageMatch 代码..."
if [ -d "/opt/imagematch" ]; then
    echo "[OK] 代码已存在，更新中..."
    cd /opt/imagematch
    sudo git pull
else
    sudo git clone https://github.com/secure-artifacts/ImageMatch.git /opt/imagematch
    cd /opt/imagematch
fi

# 3. 创建数据目录
echo ""
echo "[3/5] 创建数据目录..."
sudo mkdir -p /opt/imagematch-data/vectors
sudo mkdir -p /opt/imagematch-data/uploads/library
sudo chmod -R 777 /opt/imagematch-data

# 4. 构建 Docker 镜像
echo ""
echo "[4/5] 构建 Docker 镜像（首次需要 5-10 分钟）..."
cd /opt/imagematch
sudo docker build -t imagematch .

# 5. 启动容器
echo ""
echo "[5/5] 启动 ImageMatch..."
# 停止旧容器（如果有）
sudo docker stop imagematch 2>/dev/null || true
sudo docker rm imagematch 2>/dev/null || true

# 启动新容器
sudo docker run -d \
    --name imagematch \
    --restart unless-stopped \
    -p 80:7860 \
    -v /opt/imagematch-data/vectors:/data/vectors \
    -v /opt/imagematch-data/uploads/library:/data/uploads/library \
    -e DATA_DIR=/data/vectors \
    -e UPLOAD_DIR=/data/uploads/library \
    -e PORT=7860 \
    imagematch

echo ""
echo "============================================================"
echo "  ✅ 部署完成！"
echo ""
echo "  访问地址: http://$(curl -s ifconfig.me)"
echo "  密码: jwsyle@1991"
echo ""
echo "  数据存储: /opt/imagematch-data/"
echo "  查看日志: sudo docker logs -f imagematch"
echo "  重启服务: sudo docker restart imagematch"
echo "============================================================"
echo ""
