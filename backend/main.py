"""
main.py — FastAPI 应用入口

Image Similarity Matcher 后端服务。
启动时加载 ResNet50 模型和已有特征向量索引。
"""

import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

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
    print("[OK] Server ready!")
    print("[OK] Web UI:  http://localhost:8000")
    print("[OK] API docs: http://localhost:8000/docs")
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


@app.get("/api/stats")
async def get_stats():
    """获取系统统计信息。"""
    return {
        "library_size": vector_store.get_count() if vector_store else 0,
        "feature_dimension": embedder.feature_dim if embedder else 0,
        "model": "ResNet50 (ImageNet V2)",
    }


# 前端静态文件服务（生产模式）
# 当 frontend/dist 目录存在时，直接从后端提供前端页面
frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    # 挂载静态资源（CSS/JS/图标等）
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="frontend_assets")

    @app.get("/")
    async def serve_frontend_root():
        """提供前端入口页面。"""
        return FileResponse(str(frontend_dist / "index.html"))

    @app.get("/{path:path}")
    async def serve_frontend_fallback(request: Request, path: str):
        """SPA fallback — 所有非 API/uploads 路径都返回 index.html。"""
        # 如果是 API 或 uploads 路径，不处理（由前面的路由处理）
        if path.startswith("api/") or path.startswith("uploads/") or path.startswith("docs") or path.startswith("openapi"):
            return {"detail": "Not Found"}
        # 尝试返回静态文件（如 favicon.svg）
        static_file = frontend_dist / path
        if static_file.exists() and static_file.is_file():
            return FileResponse(str(static_file))
        # 否则返回 index.html（SPA 路由）
        return FileResponse(str(frontend_dist / "index.html"))
else:
    @app.get("/")
    async def root():
        """健康检查端点（开发模式，前端未构建时显示）。"""
        return {
            "service": "Image Similarity Matcher",
            "status": "running",
            "library_size": vector_store.get_count() if vector_store else 0,
            "hint": "Frontend not built. Run 'npm run build' in frontend/ directory, or visit http://localhost:5173 if dev server is running.",
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
