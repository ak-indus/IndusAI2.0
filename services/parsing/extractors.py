import os
from typing import Tuple

try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False

try:
    import pytesseract
    from PIL import Image
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

try:
    from bs4 import BeautifulSoup
    BS4_AVAILABLE = True
except ImportError:
    BS4_AVAILABLE = False


MIN_PDF_TEXT_LENGTH = 50


def extract_text_from_pdf(file_path: str) -> str:
    if not PDFPLUMBER_AVAILABLE:
        return ""
    pages = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
            for table in page.extract_tables():
                for row in table:
                    cells = [str(c) if c else "" for c in row]
                    pages.append(" | ".join(cells))
    combined = "\n".join(pages).strip()
    if len(combined) < MIN_PDF_TEXT_LENGTH and OCR_AVAILABLE:
        return _ocr_pdf(file_path)
    return combined


def _ocr_pdf(file_path: str) -> str:
    try:
        from pdf2image import convert_from_path
        images = convert_from_path(file_path)
        pages = []
        for img in images:
            text = pytesseract.image_to_string(img)
            if text.strip():
                pages.append(text.strip())
        return "\n".join(pages)
    except ImportError:
        return _ocr_pdf_pdfplumber(file_path)


def _ocr_pdf_pdfplumber(file_path: str) -> str:
    if not (PDFPLUMBER_AVAILABLE and OCR_AVAILABLE):
        return ""
    pages = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            img = page.to_image(resolution=300)
            pil_img = img.original
            text = pytesseract.image_to_string(pil_img)
            if text.strip():
                pages.append(text.strip())
    return "\n".join(pages)


def extract_text_from_image(file_path: str) -> str:
    if not OCR_AVAILABLE:
        return ""
    img = Image.open(file_path)
    return pytesseract.image_to_string(img).strip()


def extract_text_from_html(html: str) -> str:
    if not BS4_AVAILABLE:
        import re
        text = re.sub(r'<[^>]+>', ' ', html)
        return re.sub(r'\s+', ' ', text).strip()
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "head"]):
        tag.decompose()
    return soup.get_text(separator="\n", strip=True)


def extract_text_from_attachment(file_path: str, content_type: str) -> Tuple[str, str]:
    ct = (content_type or "").lower()
    ext = os.path.splitext(file_path)[1].lower()

    if ct == "application/pdf" or ext == ".pdf":
        return extract_text_from_pdf(file_path), "pdfplumber"

    if ct.startswith("image/") or ext in (".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp"):
        return extract_text_from_image(file_path), "pytesseract"

    if ct in ("text/plain",) or ext == ".txt":
        with open(file_path, "r", errors="replace") as f:
            return f.read(), "plain"

    if ct in ("text/html",) or ext in (".html", ".htm"):
        with open(file_path, "r", errors="replace") as f:
            return extract_text_from_html(f.read()), "html"

    if ct in ("text/csv",) or ext == ".csv":
        with open(file_path, "r", errors="replace") as f:
            return f.read(), "plain"

    return "", "unsupported"
