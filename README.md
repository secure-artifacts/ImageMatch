# ImageMatch — AI 图像相似度匹配应用

基于深度学习的图像相似度匹配工具。使用 ResNet50 预训练模型提取图像特征向量，通过余弦相似度算法在图库中查找最相似的图片。

## 功能特性

- **图片库管理**：支持批量上传图片（JPEG/PNG），自动提取特征向量并建立索引
- **相似度搜索**：上传目标图片，自动从图库中匹配相似度最高的 Top 10 张图片
- **可视化分数**：环形进度条 + 颜色编码直观展示相似度（绿色 >90%、黄色 >70%、红色 ≤70%）
- **现代化 UI**：深色主题、玻璃态效果、拖拽上传、骨架屏加载动画
- **完全本地运行**：不依赖任何云服务或 API Key，所有计算在本地完成

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端框架 | Python FastAPI |
| AI 模型 | PyTorch + ResNet50（ImageNet V2 预训练） |
| 特征维度 | 2048 维向量 |
| 向量存储 | NumPy (.npy) + JSON 索引，内存加速 |
| 前端框架 | React + TypeScript (Vite) |
| UI 样式 | Tailwind CSS v3 |
| 图标库 | Lucide React |

## 系统架构

```
用户上传图片 → FastAPI 接收 → ResNet50 提取 2048 维特征向量
                                          ↓
                               NumPy 向量存储（内存 + 文件持久化）
                                          ↓
用户上传目标图片 → 提取目标特征向量 → 余弦相似度批量计算 → 返回 Top N 结果
```

## 快速开始

### 环境要求

- Python 3.10+
- Node.js 18+
- 约 200MB 磁盘空间（用于 PyTorch CPU 版本和 ResNet50 模型权重）

### 安装与运行

#### 1. 后端

```bash
cd backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 安装 PyTorch CPU 版本
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# 安装其他依赖
pip install fastapi uvicorn[standard] python-multipart Pillow numpy scikit-learn

# 启动后端服务
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

首次启动时会自动下载 ResNet50 模型权重（约 100MB），之后会使用缓存。

后端 API 文档：http://localhost:8000/docs

#### 2. 前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端页面：http://localhost:5173

### 使用流程

1. **构建图库**：在「图片库」页面，拖拽或点击上传图片（支持批量上传）
2. **搜索相似图片**：在「相似搜索」页面，上传一张目标图片
3. **查看结果**：系统自动匹配并展示 Top 10 最相似的图片及相似度分数

## API 接口

| 方法 | 端点 | 说明 |
|------|------|------|
| `POST` | `/api/library/upload` | 批量上传图片到图库 |
| `GET` | `/api/library` | 列出图库所有图片 |
| `DELETE` | `/api/library/{image_id}` | 删除指定图片 |
| `POST` | `/api/search?top_n=10` | 上传目标图片进行相似度搜索 |
| `GET` | `/api/stats` | 获取系统统计信息 |

## 项目结构

```
ImageMatch/
├── backend/
│   ├── main.py              # FastAPI 应用入口
│   ├── embedding.py          # ResNet50 特征提取 + 相似度计算
│   ├── vector_store.py       # 向量存储管理
│   ├── requirements.txt      # Python 依赖
│   ├── routes/
│   │   ├── library.py        # 图库管理 API
│   │   └── search.py         # 搜索匹配 API
│   ├── data/                 # 向量索引和特征文件（自动生成）
│   └── uploads/library/      # 上传的图片文件（自动生成）
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # 主应用
│   │   ├── api.ts            # API 客户端
│   │   ├── components/       # 可复用组件
│   │   └── pages/            # 页面视图
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## 存储容量

- 每张图片产生 2048 维 float32 向量 ≈ 8KB 内存
- 1,000 张图片 → ~8MB 内存
- 10,000 张图片 → ~80MB 内存
- 100,000 张图片 → ~800MB 内存
- 实际瓶颈为磁盘空间（存储原始图片）和内存（存储特征向量）

## 许可证

MIT License
