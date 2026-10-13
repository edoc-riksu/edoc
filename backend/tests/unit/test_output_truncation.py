from app.services.execution_service import _truncate


def test_short_text_untouched():
    assert _truncate("hello", 4000) == "hello"


def test_long_text_truncated_with_marker():
    text = "x" * 5000
    result = _truncate(text, 4000)
    assert result.startswith("x" * 4000)
    assert "truncated" in result
    assert len(result) < len(text)


def test_text_at_exact_limit_untouched():
    text = "x" * 4000
    assert _truncate(text, 4000) == text
