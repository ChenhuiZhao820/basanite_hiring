"""ENG-25: hirer-report quotes are verified against the candidate transcript.

Each scoring_summary row's `quotation_basis` and each top_excerpts item's
`excerpt` is now stamped with `verified: True/False` based on whether it
appears (loosely — case/punctuation/whitespace insensitive) in the
candidate's actual utterances. Hallucinated quotes get `verified: False`
so a hirer can spot fabrication.
"""

import json
from unittest.mock import AsyncMock

import pytest

from agents import report


@pytest.fixture
def transcript_with_quotes():
    """A short transcript whose user turns contain known phrases the LLM
    can either quote faithfully or hallucinate around."""
    return [
        {"role": "assistant", "content": "Tell me about a trade-off you made."},
        {"role": "user",
         "content": "We chose Postgres over Cassandra to keep ops simple."},
        {"role": "assistant", "content": "Why?"},
        {"role": "user",
         "content": "Cassandra would have meant a 24/7 on-call rota."},
    ]


@pytest.fixture
def role_min():
    return {"title": "x", "dimensions": [], "interview_duration_minutes": 20}


@pytest.fixture
def cv_min():
    return {"name": "Jane", "experience_path": "path_a", "anchor_points": []}


@pytest.mark.asyncio
class TestQuoteVerification:
    async def _run(self, fake_anthropic, make_response, payload,
                   transcript, role, cv):
        fake_anthropic.messages.create = AsyncMock(
            return_value=make_response(json.dumps(payload)))
        return await report.generate_hirer_report(transcript, role, cv)

    async def test_exact_quote_is_verified(self, fake_anthropic, make_response,
                                           transcript_with_quotes, role_min, cv_min):
        payload = {
            "scoring_summary": [{
                "dimension": "judgment_under_ambiguity",
                "score": 4,
                "quotation_basis": "We chose Postgres over Cassandra to keep ops simple.",
                "notes": "",
            }],
            "composite_score": 4,
        }
        out = await self._run(fake_anthropic, make_response, payload,
                              transcript_with_quotes, role_min, cv_min)
        assert out["scoring_summary"][0]["verified"] is True

    async def test_hallucinated_quote_marked_unverified(self, fake_anthropic,
                                                        make_response,
                                                        transcript_with_quotes,
                                                        role_min, cv_min):
        payload = {
            "scoring_summary": [{
                "dimension": "judgment_under_ambiguity",
                "score": 5,
                "quotation_basis": "I single-handedly designed the entire payment system.",
                "notes": "",
            }],
            "composite_score": 5,
        }
        out = await self._run(fake_anthropic, make_response, payload,
                              transcript_with_quotes, role_min, cv_min)
        assert out["scoring_summary"][0]["verified"] is False

    async def test_paraphrased_quote_with_punctuation_drift_still_verified(
        self, fake_anthropic, make_response, transcript_with_quotes,
        role_min, cv_min,
    ):
        # LLM commonly quotes with slightly different punctuation /
        # capitalisation. Loose match should still confirm.
        payload = {
            "scoring_summary": [{
                "dimension": "judgment_under_ambiguity",
                "score": 4,
                "quotation_basis": "we chose postgres over cassandra, to keep ops simple",
                "notes": "",
            }],
            "composite_score": 4,
        }
        out = await self._run(fake_anthropic, make_response, payload,
                              transcript_with_quotes, role_min, cv_min)
        assert out["scoring_summary"][0]["verified"] is True

    async def test_empty_quote_marked_unverified(self, fake_anthropic, make_response,
                                                 transcript_with_quotes,
                                                 role_min, cv_min):
        payload = {
            "scoring_summary": [{
                "dimension": "x",
                "score": 3,
                "quotation_basis": "",
                "notes": "",
            }],
            "composite_score": 3,
        }
        out = await self._run(fake_anthropic, make_response, payload,
                              transcript_with_quotes, role_min, cv_min)
        # Empty quote can't be verified — fail closed.
        assert out["scoring_summary"][0]["verified"] is False

    async def test_top_excerpts_also_verified(self, fake_anthropic, make_response,
                                              transcript_with_quotes, role_min, cv_min):
        payload = {
            "scoring_summary": [],
            "top_excerpts": [
                {"excerpt": "We chose Postgres over Cassandra to keep ops simple.",
                 "why_selected": "tradeoff", "dimension": "j", "signal_type": "decision"},
                {"excerpt": "I personally rewrote the whole compiler.",
                 "why_selected": "fake", "dimension": "x", "signal_type": "x"},
            ],
            "composite_score": 3,
        }
        out = await self._run(fake_anthropic, make_response, payload,
                              transcript_with_quotes, role_min, cv_min)
        assert out["top_excerpts"][0]["verified"] is True
        assert out["top_excerpts"][1]["verified"] is False

    async def test_empty_transcript_marks_all_unverified(self, fake_anthropic,
                                                         make_response,
                                                         role_min, cv_min):
        payload = {
            "scoring_summary": [{
                "dimension": "x", "score": 4,
                "quotation_basis": "anything", "notes": "",
            }],
            "top_excerpts": [
                {"excerpt": "anything else", "why_selected": "", "dimension": "x", "signal_type": "x"},
            ],
            "composite_score": 4,
        }
        out = await self._run(fake_anthropic, make_response, payload,
                              [], role_min, cv_min)
        assert out["scoring_summary"][0]["verified"] is False
        assert out["top_excerpts"][0]["verified"] is False
