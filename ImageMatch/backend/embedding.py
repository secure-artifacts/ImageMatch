"""
embedding.py — 图像特征提取与相似度计算模块

使用 ResNet50 预训练模型（去掉最后分类层）提取 2048 维特征向量，
并通过余弦相似度计算图像之间的相似程度。
"""

import torch
import torch.nn as nn
import torchvision.models as models
import torchvision.transforms as transforms
from PIL import Image
import numpy as np
from typing import Union
import io


class ImageEmbedder:
    """图像特征提取器，基于 ResNet50 预训练模型。"""

    def __init__(self):
        """初始化 ResNet50 模型，去掉最后的全连接分类层。"""
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        # 加载预训练 ResNet50
        resnet = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)

        # 去掉最后的全连接层，保留到 avgpool，输出 2048 维向量
        self.model = nn.Sequential(*list(resnet.children())[:-1])
        self.model = self.model.to(self.device)
        self.model.eval()

        # 图像预处理管线（ImageNet 标准）
        self.transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            ),
        ])

        self._feature_dim = 2048

    @property
    def feature_dim(self) -> int:
        """特征向量维度。"""
        return self._feature_dim

    def extract_features(self, image_source: Union[str, bytes, Image.Image]) -> np.ndarray:
        """
        从图像中提取特征向量。

        Args:
            image_source: 图像来源，支持文件路径 (str)、字节数据 (bytes)、PIL Image 对象。

        Returns:
            np.ndarray: 归一化后的 2048 维特征向量，shape 为 (2048,)。
        """
        # 加载图像
        if isinstance(image_source, str):
            image = Image.open(image_source).convert("RGB")
        elif isinstance(image_source, bytes):
            image = Image.open(io.BytesIO(image_source)).convert("RGB")
        elif isinstance(image_source, Image.Image):
            image = image_source.convert("RGB")
        else:
            raise ValueError(f"Unsupported image source type: {type(image_source)}")

        # 预处理
        input_tensor = self.transform(image).unsqueeze(0).to(self.device)

        # 提取特征
        with torch.no_grad():
            features = self.model(input_tensor)

        # 展平为一维向量并转换为 numpy
        feature_vector = features.squeeze().cpu().numpy()

        # L2 归一化（便于后续余弦相似度计算）
        norm = np.linalg.norm(feature_vector)
        if norm > 0:
            feature_vector = feature_vector / norm

        return feature_vector


def compute_cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """
    计算两个向量的余弦相似度。

    由于特征向量已经 L2 归一化，余弦相似度等于内积。

    Args:
        vec_a: 向量 A, shape (D,)
        vec_b: 向量 B, shape (D,)

    Returns:
        float: 余弦相似度值，范围 [-1, 1]
    """
    similarity = float(np.dot(vec_a, vec_b))
    return similarity


def compute_cosine_similarity_batch(query_vec: np.ndarray, vectors: np.ndarray) -> np.ndarray:
    """
    批量计算查询向量与多个向量的余弦相似度。

    Args:
        query_vec: 查询向量, shape (D,)
        vectors: 向量矩阵, shape (N, D)

    Returns:
        np.ndarray: 相似度数组, shape (N,)，范围 [-1, 1]
    """
    if vectors.ndim == 1:
        vectors = vectors.reshape(1, -1)

    # 由于已经 L2 归一化，直接用矩阵乘法计算
    similarities = vectors @ query_vec
    return similarities
