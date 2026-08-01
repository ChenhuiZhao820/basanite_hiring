"""Tests for core.textfile — encoding-tolerant text-file decoding."""

import pytest

from core.textfile import (
    TextDecodeError,
    decode_text_file,
    looks_like_readable_text,
    normalize_text,
)


class TestDecodeTextFile:
    def test_plain_utf8(self):
        assert decode_text_file("Senior Backend Engineer".encode("utf-8")) == "Senior Backend Engineer"

    def test_empty_bytes(self):
        assert decode_text_file(b"") == ""

    def test_utf8_with_bom(self):
        data = "Job description".encode("utf-8-sig")
        assert decode_text_file(data) == "Job description"

    def test_utf16_le_with_bom(self):
        data = "Responsibilities: build APIs".encode("utf-16")  # includes BOM
        assert decode_text_file(data) == "Responsibilities: build APIs"

    def test_utf16_be_with_bom(self):
        import codecs
        data = codecs.BOM_UTF16_BE + "Hello world".encode("utf-16-be")
        assert decode_text_file(data) == "Hello world"

    def test_utf32_le_with_bom(self):
        import codecs
        data = codecs.BOM_UTF32_LE + "Hello".encode("utf-32-le")
        assert decode_text_file(data) == "Hello"

    def test_cp1252_smart_quotes(self):
        # Curly quotes encode to 0x92/0x93/0x94 in cp1252 — invalid UTF-8 continuations.
        data = "We\u2019re hiring \u201cgreat\u201d engineers".encode("cp1252")
        out = decode_text_file(data)
        assert "We\u2019re hiring \u201cgreat\u201d engineers" == out

    def test_latin1_accents(self):
        data = "Ingénieur logiciel confirmé".encode("latin-1")
        assert decode_text_file(data) == "Ingénieur logiciel confirmé"

    def test_binary_junk_rejected(self):
        import random
        rng = random.Random(42)
        data = bytes(rng.randrange(128, 256) for _ in range(4000))
        with pytest.raises(TextDecodeError) as exc:
            decode_text_file(data)
        # The message is user-facing and actionable.
        assert "re-saving it as UTF-8" in exc.value.detail

    def test_mostly_valid_utf8_with_few_bad_bytes_is_salvaged(self):
        data = ("A" * 1000).encode("utf-8") + b"\xff\xfe\xff" + ("B" * 1000).encode("utf-8")
        # \xff\xfe prefix would look like a UTF-16 BOM only at the start;
        # here it's mid-stream damage. cp1252 maps these to printable ÿþÿ,
        # so the cascade accepts at step 3 — the point is: no exception,
        # and the bulk of the text survives.
        out = decode_text_file(data)
        assert "A" * 1000 in out
        assert "B" * 1000 in out

    def test_crlf_normalised(self):
        assert decode_text_file(b"line one\r\nline two\r\n") == "line one\nline two"

    def test_nul_bytes_do_not_crash(self):
        # NULs decode fine as UTF-8 then get stripped by normalisation.
        assert decode_text_file(b"He\x00llo") == "Hello"


class TestNormalizeText:
    def test_strips_control_chars(self):
        assert normalize_text("a\x00b\x07c") == "abc"

    def test_keeps_tabs_and_newlines(self):
        assert normalize_text("a\tb\nc") == "a\tb\nc"

    def test_collapses_blank_line_runs(self):
        assert normalize_text("a\n\n\n\n\nb") == "a\n\nb"

    def test_trims_trailing_line_whitespace(self):
        assert normalize_text("a   \nb\t\n") == "a\nb"

    def test_cr_only_newlines(self):
        assert normalize_text("a\rb") == "a\nb"

    def test_empty(self):
        assert normalize_text("") == ""


class TestLooksLikeReadableText:
    def test_normal_prose(self):
        assert looks_like_readable_text("We are hiring a Senior Backend Engineer to build APIs.")

    def test_accented_and_cjk(self):
        assert looks_like_readable_text("Ingénieur 软件工程师 муж инженер")

    def test_empty_is_unreadable(self):
        assert not looks_like_readable_text("")

    def test_mojibake_wall_rejected(self):
        # Unassigned / private-use heavy garbage typical of a broken font map.
        garbage = "\ue000\ue001\ue002\ufffd" * 200
        assert not looks_like_readable_text(garbage)

    def test_mixed_mostly_garbage_rejected(self):
        text = "abc" + "\ue000" * 100
        assert not looks_like_readable_text(text)

    def test_markdown_is_readable(self):
        assert looks_like_readable_text("## Requirements\n- 5+ years Python\n- Kubernetes")
