"""Tests for ENG-36: magic-byte whitelist on /voices/clone audio uploads."""

import pytest

from api import _is_supported_voice_audio


class TestSupportedFormats:
    def test_webm_matroska(self):
        assert _is_supported_voice_audio(b"\x1a\x45\xdf\xa3rest of file...")

    def test_ogg(self):
        assert _is_supported_voice_audio(b"OggSheader...")

    def test_mp3_id3v2(self):
        assert _is_supported_voice_audio(b"ID3\x04\x00\x00\x00...")

    def test_mp3_frame_sync(self):
        assert _is_supported_voice_audio(b"\xff\xfb\x90\x44\x00...")

    def test_mp3_mpeg2_frame(self):
        assert _is_supported_voice_audio(b"\xff\xf3\x82\xc4\x00...")

    def test_wav_riff_wave(self):
        # RIFF + 4-byte little-endian size + "WAVE" + payload
        assert _is_supported_voice_audio(b"RIFF\x24\x08\x00\x00WAVErest...")


class TestRejectsUnsupported:
    def test_empty(self):
        assert not _is_supported_voice_audio(b"")

    def test_pe_executable(self):
        assert not _is_supported_voice_audio(b"MZ\x90\x00\x03\x00\x00\x00")

    def test_elf_executable(self):
        assert not _is_supported_voice_audio(b"\x7fELF\x02\x01\x01\x00")

    def test_html_polyglot(self):
        assert not _is_supported_voice_audio(b"<!doctype html><script>")

    def test_zip_archive(self):
        assert not _is_supported_voice_audio(b"PK\x03\x04\x14\x00")

    def test_png_image(self):
        assert not _is_supported_voice_audio(b"\x89PNG\r\n\x1a\n")

    def test_pdf(self):
        # PDFs are uploaded elsewhere (CVs); they shouldn't pass as audio.
        assert not _is_supported_voice_audio(b"%PDF-1.4...")

    def test_riff_without_wave(self):
        # RIFF-AVI for example.
        assert not _is_supported_voice_audio(b"RIFF\x24\x08\x00\x00AVI rest...")

    def test_random_bytes(self):
        assert not _is_supported_voice_audio(b"\x00\x01\x02\x03\x04")

    def test_short_payload(self):
        # Too short to even contain a magic — but webm magic is 4 bytes,
        # so a 4-byte buffer with the right magic should still pass.
        assert _is_supported_voice_audio(b"\x1a\x45\xdf\xa3")
        # Short non-matching shouldn't.
        assert not _is_supported_voice_audio(b"\x00")
