"""Tests for core.docx — bounded .docx text extraction."""

import io
import zipfile

import pytest

from core.docx import DocxExtractError, extract_docx_text, is_docx

_W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def build_docx(document_xml: str) -> bytes:
    """Assemble a minimal .docx (zip with word/document.xml)."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", "<Types/>")
        zf.writestr("word/document.xml", document_xml)
    return buf.getvalue()


def docx_body(*paragraphs: str) -> bytes:
    paras = "".join(
        f"<w:p><w:r><w:t>{p}</w:t></w:r></w:p>" for p in paragraphs
    )
    xml = f'<?xml version="1.0"?><w:document xmlns:w="{_W}"><w:body>{paras}</w:body></w:document>'
    return build_docx(xml)


class TestIsDocx:
    def test_real_docx(self):
        assert is_docx(docx_body("Hello"))

    def test_plain_zip_is_not_docx(self):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as zf:
            zf.writestr("readme.txt", "hi")
        assert not is_docx(buf.getvalue())

    def test_non_zip_bytes(self):
        assert not is_docx(b"%PDF-1.4 not a zip")
        assert not is_docx(b"")

    def test_corrupt_zip_magic_only(self):
        assert not is_docx(b"PK\x03\x04garbage")


class TestExtractDocxText:
    def test_extracts_paragraphs(self):
        data = docx_body("Senior Backend Engineer", "Responsibilities: build APIs")
        out = extract_docx_text(data)
        assert out == "Senior Backend Engineer\nResponsibilities: build APIs"

    def test_multiple_runs_concatenated(self):
        xml = (
            f'<?xml version="1.0"?><w:document xmlns:w="{_W}"><w:body>'
            "<w:p><w:r><w:t>Hello </w:t></w:r><w:r><w:t>world</w:t></w:r></w:p>"
            "</w:body></w:document>"
        )
        assert extract_docx_text(build_docx(xml)) == "Hello world"

    def test_br_and_tab_rendered(self):
        xml = (
            f'<?xml version="1.0"?><w:document xmlns:w="{_W}"><w:body>'
            "<w:p><w:r><w:t>a</w:t><w:br/><w:t>b</w:t><w:tab/><w:t>c</w:t></w:r></w:p>"
            "</w:body></w:document>"
        )
        assert extract_docx_text(build_docx(xml)) == "a\nb\tc"

    def test_not_a_zip_raises(self):
        with pytest.raises(DocxExtractError):
            extract_docx_text(b"definitely not a zip archive")

    def test_zip_without_document_xml_raises(self):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as zf:
            zf.writestr("xl/workbook.xml", "<workbook/>")  # xlsx-shaped
        with pytest.raises(DocxExtractError) as exc:
            extract_docx_text(buf.getvalue())
        assert ".docx" in exc.value.detail

    def test_corrupt_xml_raises(self):
        data = build_docx("<w:document unclosed")
        with pytest.raises(DocxExtractError) as exc:
            extract_docx_text(data)
        assert "corrupted" in exc.value.detail

    def test_output_capped(self):
        data = docx_body(*["x" * 1000] * 50)  # 50K chars
        out = extract_docx_text(data, max_chars=5000)
        assert len(out) <= 5000

    def test_declared_size_bomb_refused(self):
        # A document.xml whose zip header declares an absurd uncompressed
        # size must be refused before decompression.
        big_xml = (
            f'<?xml version="1.0"?><w:document xmlns:w="{_W}"><w:body>'
            + "<w:p><w:r><w:t>" + "a" * (21 * 1024 * 1024) + "</w:t></w:r></w:p>"
            + "</w:body></w:document>"
        )
        data = build_docx(big_xml)
        with pytest.raises(DocxExtractError) as exc:
            extract_docx_text(data)
        assert "too large" in exc.value.detail

    def test_empty_body(self):
        xml = f'<?xml version="1.0"?><w:document xmlns:w="{_W}"><w:body/></w:document>'
        assert extract_docx_text(build_docx(xml)) == ""
