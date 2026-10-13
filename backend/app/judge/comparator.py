def _normalize(output: str) -> str:
    """Normalize stdout for comparison: unify line endings, strip trailing
    whitespace per line, and drop trailing blank lines. Deliberately simple —
    this is not a special judge, just tolerant of harmless formatting noise."""

    lines = output.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    lines = [line.rstrip() for line in lines]
    while lines and lines[-1] == "":
        lines.pop()
    return "\n".join(lines)


def compare_output(actual: str, expected: str) -> bool:
    return _normalize(actual) == _normalize(expected)
