from app.judge.comparator import compare_output


def test_exact_match():
    assert compare_output("5", "5") is True


def test_tolerates_trailing_newline():
    assert compare_output("5\n", "5") is True
    assert compare_output("5", "5\n\n") is True


def test_tolerates_trailing_whitespace_per_line():
    assert compare_output("5 \t\n", "5") is True


def test_tolerates_crlf():
    assert compare_output("5\r\n", "5\n") is True


def test_mismatch():
    assert compare_output("5", "6") is False


def test_multiline_mismatch_order_matters():
    assert compare_output("a\nb", "b\na") is False
