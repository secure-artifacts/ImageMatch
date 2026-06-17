"""
batch_upload.py — ImageMatch 批量图片上传工具

使用方法：
  python batch_upload.py --server http://你的VM的IP --folder D:\你的图片文件夹

功能：
  - 自动扫描文件夹中所有 JPEG/PNG 图片
  - 每次上传5张，显示进度
  - 自动跳过已上传的图片
  - 失败自动重试
"""

import argparse
import os
import sys
import time
from pathlib import Path

import requests

# 支持的图片格式
SUPPORTED_FORMATS = {'.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'}
BATCH_SIZE = 5  # 每次上传5张


def get_uploaded_filenames(server_url: str) -> set:
    """获取服务器上已有的图片文件名，用于跳过重复上传"""
    try:
        resp = requests.get(f"{server_url}/api/library", timeout=30)
        if resp.status_code == 200:
            data = resp.json()
            return {img['filename'] for img in data.get('images', [])}
    except Exception:
        pass
    return set()


def upload_batch(server_url: str, file_paths: list) -> tuple:
    """上传一批图片，返回 (成功数, 失败数)"""
    files = []
    opened = []
    try:
        for path in file_paths:
            f = open(path, 'rb')
            opened.append(f)
            files.append(('files', (Path(path).name, f, 'image/jpeg')))

        resp = requests.post(
            f"{server_url}/api/library/upload",
            files=files,
            timeout=300  # 5分钟超时
        )

        if resp.status_code == 200:
            data = resp.json()
            return data.get('uploaded', 0), data.get('failed', 0)
        else:
            return 0, len(file_paths)
    except Exception as e:
        print(f"  ❌ 批次上传错误: {e}")
        return 0, len(file_paths)
    finally:
        for f in opened:
            f.close()


def main():
    parser = argparse.ArgumentParser(description='ImageMatch 批量图片上传工具')
    parser.add_argument('--server', required=True, help='服务器地址，例如 http://35.212.146.217')
    parser.add_argument('--folder', required=True, help='图片文件夹路径')
    parser.add_argument('--batch', type=int, default=BATCH_SIZE, help='每批上传数量（默认5）')
    parser.add_argument('--skip-existing', action='store_true', default=True, help='跳过已上传的图片')
    args = parser.parse_args()

    server_url = args.server.rstrip('/')
    folder = Path(args.folder)

    # 检查文件夹是否存在
    if not folder.exists():
        print(f"❌ 文件夹不存在: {folder}")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"  ImageMatch 批量上传工具")
    print(f"  服务器: {server_url}")
    print(f"  文件夹: {folder}")
    print(f"{'='*60}\n")

    # 扫描图片
    all_images = [
        f for f in folder.rglob('*')
        if f.suffix in SUPPORTED_FORMATS and f.is_file()
    ]
    print(f"[+] 找到 {len(all_images)} 张图片")

    if not all_images:
        print("❌ 未找到任何 JPEG/PNG 图片")
        sys.exit(1)

    # 获取已上传列表
    if args.skip_existing:
        print("[+] 正在获取已上传图片列表...")
        uploaded = get_uploaded_filenames(server_url)
        print(f"[+] 服务器已有 {len(uploaded)} 张图片")
        images_to_upload = [f for f in all_images if f.name not in uploaded]
        skipped = len(all_images) - len(images_to_upload)
        if skipped > 0:
            print(f"[+] 跳过已上传: {skipped} 张")
    else:
        images_to_upload = all_images

    print(f"[+] 待上传: {len(images_to_upload)} 张\n")

    if not images_to_upload:
        print("✅ 所有图片都已上传，无需重复上传！")
        sys.exit(0)

    # 批量上传
    total_success = 0
    total_failed = 0
    total = len(images_to_upload)
    batch_size = args.batch

    start_time = time.time()

    for i in range(0, total, batch_size):
        batch = images_to_upload[i:i + batch_size]
        batch_num = i // batch_size + 1
        total_batches = (total + batch_size - 1) // batch_size

        print(f"[{batch_num}/{total_batches}] 上传中: {[f.name for f in batch]}")

        success, failed = upload_batch(server_url, batch)
        total_success += success
        total_failed += failed

        elapsed = time.time() - start_time
        progress = (i + len(batch)) / total * 100
        rate = (i + len(batch)) / elapsed if elapsed > 0 else 0
        eta = (total - i - len(batch)) / rate if rate > 0 else 0

        print(f"  ✅ 成功 {success} 张 | 进度: {progress:.1f}% | "
              f"速度: {rate:.1f}张/秒 | 预计剩余: {eta:.0f}秒\n")

    # 总结
    elapsed = time.time() - start_time
    print(f"\n{'='*60}")
    print(f"  ✅ 上传完成！")
    print(f"  成功: {total_success} 张")
    print(f"  失败: {total_failed} 张")
    print(f"  用时: {elapsed:.0f} 秒")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
