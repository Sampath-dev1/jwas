from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
import os
import uuid
from PIL import Image
import io

from app.core.config import settings
from app.permissions.deps import get_current_user

router = APIRouter(prefix="/uploads", tags=["Uploads"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024 # 5 MB

@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No filename provided.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file extension: '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid MIME type: '{file.content_type}'. Allowed: {', '.join(ALLOWED_MIME_TYPES)}"
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum permitted limit (5MB)."
        )

    # Validate image integrity with PIL
    try:
        img = Image.open(io.BytesIO(content))
        img.verify()
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is corrupted or not a valid image.")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, unique_filename)

    with open(filepath, "wb") as f:
        f.write(content)

    file_url = f"{settings.BACKEND_URL}/uploads/{unique_filename}"
    return {
        "url": file_url,
        "filename": unique_filename,
        "size_bytes": len(content)
    }
