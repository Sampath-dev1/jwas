from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Request, status
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
import os
import uuid
import io
import mimetypes
import logging
from PIL import Image, ImageOps

from app.core.config import settings
from app.core.database import get_db
from app.models.models import UploadedAsset
from app.permissions.deps import get_current_user_optional

logger = logging.getLogger("jwas.uploads")

router = APIRouter(prefix="/uploads", tags=["Uploads"])

ALLOWED_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".webp", ".jfif", ".jpe",
    ".gif", ".bmp", ".svg", ".avif", ".ico", ".tif", ".tiff"
}

# 25 MB max limit to easily support large high-res photos from laptops & phones
MAX_FILE_SIZE = 25 * 1024 * 1024 

@router.post("/image")
async def upload_image(
    request: Request,
    file: UploadFile = File(...),
    current_user = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No filename provided.")

    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    
    # Handle cases where filename has no extension or non-standard
    if not ext:
        if file.content_type == "image/png":
            ext = ".png"
        elif file.content_type in ("image/jpeg", "image/pjpeg", "image/jfif"):
            ext = ".jpg"
        elif file.content_type == "image/webp":
            ext = ".webp"
        elif file.content_type == "image/gif":
            ext = ".gif"
        elif file.content_type == "image/svg+xml":
            ext = ".svg"
        else:
            ext = ".jpg"

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Supported: JPG, PNG, WEBP, JFIF, GIF, BMP, SVG, AVIF."
        )

    # Validate Content-Type loosely, as Windows browsers often send generic application/octet-stream or image/pjpeg
    content_type = file.content_type or ""
    is_valid_mime = (
        not content_type
        or content_type.startswith("image/")
        or content_type in ("application/octet-stream", "application/x-zip-compressed", "binary/octet-stream")
    )
    if not is_valid_mime:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file MIME type: '{content_type}'."
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum permitted limit ({MAX_FILE_SIZE // (1024 * 1024)}MB)."
        )

    if len(content) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    target_ext = ext
    if ext in (".jfif", ".jpe"):
        target_ext = ".jpg"

    unique_filename = f"{uuid.uuid4().hex}{target_ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, unique_filename)

    # Process and validate image
    if ext == ".svg":
        # Validate SVG text
        try:
            svg_text = content.decode("utf-8", errors="ignore").strip().lower()
            if "<svg" not in svg_text:
                raise ValueError("Not a valid SVG")
            with open(filepath, "wb") as f:
                f.write(content)
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded SVG is corrupted or invalid.")
    elif ext == ".gif":
        # Save animated GIFs directly without altering frames
        try:
            img = Image.open(io.BytesIO(content))
            img.load()
            with open(filepath, "wb") as f:
                f.write(content)
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded GIF is corrupted.")
    else:
        # Bitmap image validation, auto-orientation, and web optimization
        try:
            img = Image.open(io.BytesIO(content))
            img.load()
            
            # Transpose orientation according to EXIF (fixes sideways/upside-down laptop/phone photos)
            try:
                img = ImageOps.exif_transpose(img) or img
            except Exception:
                pass

            # Downscale overly huge images to max 2400px to ensure fast page loads
            max_dim = 2400
            if max(img.width, img.height) > max_dim:
                img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

            # Save optimized output
            if target_ext in (".jpg", ".jpeg"):
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                img.save(filepath, format="JPEG", quality=88, optimize=True)
            elif target_ext == ".webp":
                img.save(filepath, format="WEBP", quality=88, method=6)
            elif target_ext == ".png":
                img.save(filepath, format="PNG", optimize=True)
            else:
                # Fallback to direct write
                with open(filepath, "wb") as f:
                    f.write(content)
        except Exception as e:
            # If PIL fails on custom formats (like AVIF without plugin), try raw byte write if bytes look like image
            try:
                with open(filepath, "wb") as f:
                    f.write(content)
            except Exception:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is corrupted or not a valid image.")

    # Persist asset in PostgreSQL database so it survives cloud container restarts and ephemeral disk wipes
    try:
        if os.path.exists(filepath):
            with open(filepath, "rb") as f:
                saved_data = f.read()
            mime_type, _ = mimetypes.guess_type(filepath)
            asset = UploadedAsset(
                filename=unique_filename,
                content_type=mime_type or "image/jpeg",
                file_data=saved_data
            )
            db.add(asset)
            db.commit()
    except Exception as e:
        logger.warning(f"Failed to persist asset to PostgreSQL database: {e}")
        db.rollback()

    # Dynamically build base URL so it matches the current server address (localhost, IP, domain, Render, etc.)
    scheme = "http"
    try:
        scheme = request.headers.get("x-forwarded-proto") or (request.url.scheme if hasattr(request, "url") else "http") or "http"
    except Exception:
        pass

    host = None
    try:
        host = request.headers.get("x-forwarded-host") or request.headers.get("host")
        if not host and hasattr(request, "url"):
            host = request.url.netloc
    except Exception:
        pass

    if host:
        base_url = f"{scheme}://{host}".rstrip("/")
    elif settings.BACKEND_URL and "localhost" not in settings.BACKEND_URL:
        base_url = settings.BACKEND_URL.rstrip("/")
    else:
        try:
            base_url = str(request.base_url).rstrip("/")
        except Exception:
            base_url = settings.BACKEND_URL.rstrip("/")

    file_url = f"{base_url}/uploads/{unique_filename}"
    relative_url = f"/uploads/{unique_filename}"

    return {
        "url": file_url,
        "relative_url": relative_url,
        "filename": unique_filename,
        "size_bytes": os.path.getsize(filepath) if os.path.exists(filepath) else len(content)
    }

@router.get("/{filename}")
async def get_uploaded_image_route(filename: str, db: Session = Depends(get_db)):
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    if os.path.exists(filepath):
        mime_type, _ = mimetypes.guess_type(filepath)
        return FileResponse(filepath, media_type=mime_type or "image/jpeg", headers={"Cache-Control": "public, max-age=86400"})

    asset = db.query(UploadedAsset).filter(UploadedAsset.filename == filename).first()
    if asset:
        try:
            with open(filepath, "wb") as f:
                f.write(asset.file_data)
        except Exception:
            pass
        return Response(content=asset.file_data, media_type=asset.content_type, headers={"Cache-Control": "public, max-age=86400"})

    raise HTTPException(status_code=404, detail="Image not found")
