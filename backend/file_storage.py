# file_storage.py - Secure file storage system
import os
import uuid
import shutil
from pathlib import Path
from typing import Optional, BinaryIO
from datetime import datetime, timedelta
from fastapi import UploadFile, HTTPException
from dotenv import load_dotenv

load_dotenv()

# File storage configuration
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB default
ALLOWED_EXTENSIONS = set(os.getenv("ALLOWED_EXTENSIONS", "pdf,doc,docx,txt,jpg,jpeg,png,gif").split(","))

# Ensure upload directory exists
UPLOAD_DIR.mkdir(exist_ok=True)

# Create subdirectories
(UPLOAD_DIR / "attachments").mkdir(exist_ok=True)
(UPLOAD_DIR / "avatars").mkdir(exist_ok=True)
(UPLOAD_DIR / "temp").mkdir(exist_ok=True)


class SecureFileStorage:
    """Secure file storage system with access controls"""
    
    def __init__(self, base_dir: Path = UPLOAD_DIR):
        self.base_dir = base_dir
        self.max_file_size = MAX_FILE_SIZE
        self.allowed_extensions = ALLOWED_EXTENSIONS
    
    def _validate_file(self, file: UploadFile) -> None:
        """Validate file size and extension"""
        if file.size and file.size > self.max_file_size:
            raise HTTPException(
                status_code=413,
                detail=f"File size exceeds maximum allowed size of {self.max_file_size} bytes"
            )
        
        if file.filename:
            file_ext = file.filename.split(".")[-1].lower()
            if file_ext not in self.allowed_extensions:
                raise HTTPException(
                    status_code=400,
                    detail=f"File extension '{file_ext}' is not allowed. Allowed extensions: {', '.join(self.allowed_extensions)}"
                )
    
    def _generate_secure_filename(self, original_filename: str) -> str:
        """Generate a secure filename using UUID"""
        file_ext = original_filename.split(".")[-1] if "." in original_filename else ""
        secure_name = str(uuid.uuid4())
        return f"{secure_name}.{file_ext}" if file_ext else secure_name
    
    def save_file(
        self, 
        file: UploadFile, 
        subdirectory: str = "attachments",
        user_id: Optional[str] = None
    ) -> dict:
        """Save a file securely"""
        self._validate_file(file)
        
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        # Generate secure filename
        secure_filename = self._generate_secure_filename(file.filename)
        
        # Create target directory
        target_dir = self.base_dir / subdirectory
        target_dir.mkdir(exist_ok=True)
        
        # Save file
        file_path = target_dir / secure_filename
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            # Clean up on error
            if file_path.exists():
                file_path.unlink()
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        
        # Return file metadata
        return {
            "filename": secure_filename,
            "original_filename": file.filename,
            "file_path": str(file_path.relative_to(self.base_dir)),
            "file_size": file.size or os.path.getsize(file_path),
            "content_type": file.content_type,
            "uploaded_by": user_id,
            "uploaded_at": datetime.utcnow().isoformat()
        }
    
    def get_file_path(self, file_path: str) -> Path:
        """Get full file path (with validation)"""
        full_path = self.base_dir / file_path
        
        # Security check: ensure the path is within the base directory
        try:
            full_path.resolve().relative_to(self.base_dir.resolve())
        except ValueError:
            raise HTTPException(status_code=403, detail="Access denied: invalid file path")
        
        if not full_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        return full_path
    
    def delete_file(self, file_path: str) -> bool:
        """Delete a file"""
        try:
            full_path = self.get_file_path(file_path)
            full_path.unlink()
            return True
        except HTTPException:
            return False
        except Exception:
            return False
    
    def cleanup_temp_files(self, max_age_hours: int = 24) -> int:
        """Clean up temporary files older than specified hours"""
        temp_dir = self.base_dir / "temp"
        if not temp_dir.exists():
            return 0
        
        cutoff_time = datetime.utcnow() - timedelta(hours=max_age_hours)
        deleted_count = 0
        
        try:
            for file_path in temp_dir.iterdir():
                if file_path.is_file():
                    file_mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
                    if file_mtime < cutoff_time:
                        file_path.unlink()
                        deleted_count += 1
        except Exception as e:
            print(f"Error cleaning up temp files: {e}")
        
        return deleted_count
    
    def get_file_info(self, file_path: str) -> dict:
        """Get file information"""
        full_path = self.get_file_path(file_path)
        stat = full_path.stat()
        
        return {
            "filename": full_path.name,
            "file_path": file_path,
            "file_size": stat.st_size,
            "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
            "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            "is_file": full_path.is_file(),
            "is_dir": full_path.is_dir()
        }


# Global file storage instance
file_storage = SecureFileStorage()


def get_file_storage() -> SecureFileStorage:
    """Get the global file storage instance"""
    return file_storage
