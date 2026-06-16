"""
routes/search.py — 图像相似度搜索 API 路由

提供上传目标图片并搜索相似图片的功能。
"""

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from pathlib import Path

router = APIRouter(prefix="/api", tags=["Search"])

# 允许的图片格式
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}


def get_embedder():
    """获取全局 embedder 实例。"""
    from main import embedder
    return embedder


def get_store():
    """获取全局 vector store 实例。"""
    from main import vector_store
    return vector_store


@router.post("/search")
async def search_similar(
    file: UploadFile = File(...),
    top_n: int = Query(default=10, ge=1, le=50, description="返回前 N 个最相似的结果"),
):
    """
    上传目标图片，搜索图库中最相似的图片。

    提取目标图片的特征向量，与图库中所有向量计算余弦相似度，
    返回相似度最高的 Top N 张图片。
    """
    embedder = get_embedder()
    store = get_store()

    # 验证文件类型
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Only JPEG/PNG are allowed.",
        )

    # 检查图库是否为空
    if store.get_count() == 0:
        raise HTTPException(
            status_code=400,
            detail="Image library is empty. Please upload images to the library first.",
        )

    try:
        # 读取上传文件
        content = await file.read()

        # 提取目标图片的特征向量
        query_vector = embedder.extract_features(content)

        # 在图库中搜索相似图片
        results = store.search_similar(query_vector, top_n=top_n)

        # 为结果添加访问 URL
        for result in results:
            result["image_url"] = f"/uploads/library/{Path(result['file_path']).name}"

        return {
            "query_filename": file.filename,
            "total_results": len(results),
            "results": results,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing search: {str(e)}",
        )
