import os
import io
import shutil
from typing import BinaryIO, Optional
from app.core.config import settings

class StorageService:
    def __init__(self):
        self.storage_type = settings.STORAGE_TYPE
        if self.storage_type == "minio":
            try:
                from minio import Minio
                self.client = Minio(
                    settings.MINIO_ENDPOINT,
                    access_key=settings.MINIO_ACCESS_KEY,
                    secret_key=settings.MINIO_SECRET_KEY,
                    secure=settings.MINIO_SECURE
                )
                self.bucket = settings.MINIO_BUCKET_NAME
                if not self.client.bucket_exists(self.bucket):
                    self.client.make_bucket(self.bucket)
            except Exception as e:
                print(f"[Storage] MinIO unavailable ({e}), falling back to local filesystem storage.")
                self.storage_type = "local"
        
        if self.storage_type == "local":
            self.base_dir = os.path.abspath(settings.LOCAL_STORAGE_DIR)
            os.makedirs(self.base_dir, exist_ok=True)

    def save_bytes(self, object_key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        if self.storage_type == "minio":
            data_stream = io.BytesIO(data)
            self.client.put_object(
                self.bucket,
                object_key,
                data_stream,
                length=len(data),
                content_type=content_type
            )
            return object_key
        else:
            file_path = os.path.join(self.base_dir, object_key)
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, "wb") as f:
                f.write(data)
            return object_key

    def get_bytes(self, object_key: str) -> Optional[bytes]:
        if self.storage_type == "minio":
            try:
                response = self.client.get_object(self.bucket, object_key)
                data = response.read()
                response.close()
                response.release_conn()
                return data
            except Exception:
                return None
        else:
            file_path = os.path.join(self.base_dir, object_key)
            if not os.path.exists(file_path):
                return None
            with open(file_path, "rb") as f:
                return f.read()

    def get_local_path(self, object_key: str) -> Optional[str]:
        """Provides a local file path for analysis engines that require reading directly from disk."""
        if self.storage_type == "local":
            path = os.path.join(self.base_dir, object_key)
            return path if os.path.exists(path) else None
        else:
            # Download temporarily if in MinIO
            temp_dir = os.path.join(os.path.abspath(settings.LOCAL_STORAGE_DIR), "temp")
            os.makedirs(temp_dir, exist_ok=True)
            temp_path = os.path.join(temp_dir, os.path.basename(object_key))
            data = self.get_bytes(object_key)
            if data is None:
                return None
            with open(temp_path, "wb") as f:
                f.write(data)
            return temp_path

storage_client = StorageService()
