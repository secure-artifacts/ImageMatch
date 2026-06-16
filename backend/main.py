"""
main.py — FastAPI 应用入口

Image Similarity Matcher 后端服务。
启动时加载 ResNet50 模型和已有特征向量索引。
"""

import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from embedding import ImageEmbedder
from vector_store import VectorStore

# 全局实例（在 lifespan 中初始化）
embedder: ImageEmbedder = None  # type: ignore
vector_store: VectorStore = None  # type: ignore


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理：启动时加载模型和数据，关闭时清理资源。"""
    global embedder, vector_store

    print("=" * 60)
    print("[*] Image Similarity Matcher -- Starting Up")
    print("=" * 60)

    # 1. 加载 ResNet50 模型
    print("\n[+] Loading ResNet50 model...")
    embedder = ImageEmbedder()
    print(f"[OK] Model loaded. Feature dimension: {embedder.feature_dim}")

    # 2. 加载向量存储
    print("\n[+] Loading vector store...")
    vector_store = VectorStore(storage_dir="./data")
    print(f"[OK] Vector store loaded. {vector_store.get_count()} images in library.")

    # 3. 确保上传目录存在
    upload_dir = Path("./uploads/library")
    upload_dir.mkdir(parents=True, exist_ok=True)
    print(f"\n[+] Upload directory: {upload_dir.resolve()}")

    print("\n" + "=" * 60)
    print("[OK] Server ready! Visit http://localhost:8000/docs for API docs.")
    print("=" * 60 + "\n")

    yield  # 应用运行中

    # 关闭清理
    print("\n[*] Shutting down...")


# 创建 FastAPI 应用
app = FastAPI(
    title="Image Similarity Matcher",
    description="图像相似度匹配应用 — 上传图片到图库，搜索最相似的图片",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS 配置（允许前端跨域访问）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 开发环境允许所有来源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件服务（提供上传的图片访问）
upload_dir = Path("./uploads/library")
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads/library", StaticFiles(directory=str(upload_dir)), name="library_images")

# 注册路由
from routes.library import router as library_router
from routes.search import router as search_router

app.include_router(library_router)
app.include_router(search_router)


@app.get("/")
async def root():
    """健康检查端点。"""
    return {
        "service": "Image Similarity Matcher",
        "status": "running",
        "library_size": vector_store.get_count() if vector_store else 0,
    }


@app.get("/api/stats")
async def get_stats():
    """获取系统统计信息。"""
    return {
        "library_size": vector_store.get_count() if vector_store else 0,
        "feature_dimension": embedder.feature_dim if embedder else 0,
        "model": "ResNet50 (ImageNet V2)",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
