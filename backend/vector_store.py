"""
vector_store.py — 向量存储管理模块

管理图库中所有图片的特征向量，提供增删查改和相似度搜索功能。
使用内存 + 文件持久化双重存储策略。
"""

import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

import numpy as np

from embedding import compute_cosine_similarity_batch


class VectorStore:
    """向量存储管理器。"""

    def __init__(self, storage_dir: str = "./data"):
        """
        初始化向量存储。

        Args:
            storage_dir: 数据存储目录，包含索引文件和向量文件。
        """
        self.storage_dir = Path(storage_dir)
        self.vectors_dir = self.storage_dir / "vectors"
        self.index_path = self.storage_dir / "index.json"

        # 确保存储目录存在
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.vectors_dir.mkdir(parents=True, exist_ok=True)

        # 内存中的索引: {image_id: metadata_dict}
        self._index: dict[str, dict] = {}

        # 内存中的向量缓存: {image_id: np.ndarray}
        self._vectors: dict[str, np.ndarray] = {}

        # 从文件加载已有数据
        self._load_index()

    def _load_index(self):
        """从磁盘加载索引和向量。"""
        if self.index_path.exists():
            with open(self.index_path, "r", encoding="utf-8") as f:
                self._index = json.load(f)

            # 加载所有向量到内存
            for image_id, meta in self._index.items():
                vector_path = self.vectors_dir / f"{image_id}.npy"
                if vector_path.exists():
                    self._vectors[image_id] = np.load(str(vector_path))
                else:
                    # 向量文件丢失，从索引中移除
                    print(f"Warning: Vector file missing for {image_id}, skipping.")

            # 清理索引中向量文件丢失的条目
            self._index = {
                k: v for k, v in self._index.items() if k in self._vectors
            }

            print(f"Loaded {len(self._vectors)} vectors from storage.")
        else:
            print("No existing index found. Starting with empty store.")

    def _save_index(self):
        """将索引持久化到磁盘。"""
        with open(self.index_path, "w", encoding="utf-8") as f:
            json.dump(self._index, f, indent=2, ensure_ascii=False)

    def add(
        self,
        vector: np.ndarray,
        filename: str,
        file_path: str,
        image_id: Optional[str] = None,
    ) -> str:
        """
        添加一个图片的特征向量。

        Args:
            vector: 特征向量, shape (D,)
            filename: 原始文件名
            file_path: 图片文件在服务器上的路径
            image_id: 可选的唯一标识，不提供则自动生成

        Returns:
            str: 图片的唯一标识 (image_id)
        """
        if image_id is None:
            image_id = str(uuid.uuid4())

        # 保存向量到 .npy 文件
        vector_path = self.vectors_dir / f"{image_id}.npy"
        np.save(str(vector_path), vector)

        # 更新内存缓存
        self._vectors[image_id] = vector

        # 更新索引
        self._index[image_id] = {
            "filename": filename,
            "file_path": file_path,
            "created_at": datetime.now().isoformat(),
        }

        # 持久化索引
        self._save_index()

        return image_id

    def remove(self, image_id: str) -> bool:
        """
        删除一个图片及其向量。

        Args:
            image_id: 图片唯一标识

        Returns:
            bool: 是否删除成功
        """
        if image_id not in self._index:
            return False

        # 删除向量文件
        vector_path = self.vectors_dir / f"{image_id}.npy"
        if vector_path.exists():
            os.remove(str(vector_path))

        # 从内存移除
        self._vectors.pop(image_id, None)
        self._index.pop(image_id, None)

        # 持久化索引
        self._save_index()

        return True

    def get_all(self) -> list[dict]:
        """
        获取图库中所有图片的元数据。

        Returns:
            list[dict]: 包含 image_id 和 metadata 的列表
        """
        results = []
        for image_id, meta in self._index.items():
            results.append({
                "image_id": image_id,
                **meta,
            })
        return results

    def get_count(self) -> int:
        """获取图库中图片的总数。"""
        return len(self._index)

    def search_similar(
        self, query_vector: np.ndarray, top_n: int = 10
    ) -> list[dict]:
        """
        搜索与查询向量最相似的 Top N 张图片。

        Args:
            query_vector: 查询向量, shape (D,)
            top_n: 返回前 N 个结果

        Returns:
            list[dict]: 排序后的结果列表，包含 image_id, similarity_score, metadata
        """
        if not self._vectors:
            return []

        # 构建向量矩阵
        image_ids = list(self._vectors.keys())
        vector_matrix = np.array([self._vectors[iid] for iid in image_ids])

        # 批量计算余弦相似度
        similarities = compute_cosine_similarity_batch(query_vector, vector_matrix)

        # 获取 Top N 的索引
        n = min(top_n, len(image_ids))
        top_indices = np.argsort(similarities)[::-1][:n]

        # 构建结果
        results = []
        for idx in top_indices:
            image_id = image_ids[idx]
            score = float(similarities[idx])
            # 将余弦相似度转换为百分比 (0-100)
            score_percentage = round(max(0, score) * 100, 2)

            results.append({
                "image_id": image_id,
                "similarity_score": score,
                "similarity_score_percentage": score_percentage,
                **self._index[image_id],
            })

        return results

    def exists(self, image_id: str) -> bool:
        """检查指定 image_id 是否存在。"""
        return image_id in self._index
