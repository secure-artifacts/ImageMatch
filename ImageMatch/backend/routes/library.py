"""
routes/library.py — 图库管理 API 路由

提供图库的上传、查看、删除功能。
"""

import os
import shutil
import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile

router = APIRouter(prefix="/api/library", tags=["Library"])

# 图片存储目录
UPLOAD_DIR = Path("./uploads/library")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# 允许的图片格式
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB


def get_embedder():
    """获取全局 embedder 实例（延迟导入避免循环依赖）。"""
    from main import embedder
    return embedder


def get_store():
    """获取全局 vector store 实例。"""
    from main import vector_store
    return vector_store


@router.post("/upload")
async def upload_to_library(files: List[UploadFile] = File(...)):
    """
    批量上传图片到图库。

    上传后立即提取特征向量并保存。
    支持 JPEG 和 PNG 格式，单文件最大 20MB。
    """
    embedder = get_embedder()
    store = get_store()

    results = []
    errors = []

    for file in files:
        try:
            # 验证文件类型
            ext = Path(file.filename).suffix.lower()
            if ext not in ALLOWED_EXTENSIONS:
                errors.append({
                    "filename": file.filename,
                    "error": f"Unsupported file type: {ext}. Only JPEG/PNG are allowed."
                })
                continue

            # 读取文件内容
            content = await file.read()

            # 验证文件大小
            if len(content) > MAX_FILE_SIZE:
                errors.append({
                    "filename": file.filename,
                    "error": f"File too large: {len(content)} bytes. Max is {MAX_FILE_SIZE} bytes."
                })
                continue

            # 生成唯一文件名
            image_id = str(uuid.uuid4())
            safe_filename = f"{image_id}{ext}"
            file_path = UPLOAD_DIR / safe_filename

            # 保存图片文件
            with open(file_path, "wb") as f:
                f.write(content)

            # 提取特征向量
            feature_vector = embedder.extract_features(content)

            # 存入向量库
            store.add(
                vector=feature_vector,
                filename=file.filename,
                file_path=str(file_path),
                image_id=image_id,
            )

            results.append({
                "image_id": image_id,
                "filename": file.filename,
                "status": "success",
            })

        except Exception as e:
            errors.append({
                "filename": file.filename,
                "error": str(e),
            })

    return {
        "uploaded": len(results),
        "failed": len(errors),
        "results": results,
        "errors": errors,
    }


@router.get("")
async def list_library():
    """
    列出图库中所有图片。

    返回每张图片的 ID、文件名、缩略图 URL 和创建时间。
    """
    store = get_store()
    images = store.get_all()

    # 为每张图片添加访问 URL
    for img in images:
        img["image_url"] = f"/uploads/library/{Path(img['file_path']).name}"

    return {
        "total": len(images),
        "images": images,
    }


@router.delete("/{image_id}")
async def delete_from_library(image_id: str):
    """
    删除图库中的指定图片。

    同时删除图片文件和特征向量。
    """
    store = get_store()

    # 检查图片是否存在
    if not store.exists(image_id):
        raise HTTPException(status_code=404, detail=f"Image {image_id} not found.")

    # 获取图片信息以删除文件
    all_images = store.get_all()
    image_info = next((img for img in all_images if img["image_id"] == image_id), None)

    if image_info:
        # 删除图片文件
        file_path = Path(image_info["file_path"])
        if file_path.exists():
            os.remove(str(file_path))

    # 从向量库中删除
    success = store.remove(image_id)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to remove image from store.")

    return {
        "status": "success",
        "message": f"Image {image_id} deleted successfully.",
    }
