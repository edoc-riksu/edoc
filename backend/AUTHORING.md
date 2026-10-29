# Writing an encounter

An encounter is one coding problem a player meets on a planet: a problem
statement, starter code, tests, three hints and an explanation shown when
they lose. The plan needs 40 or more. Each takes roughly 60 to 90 minutes.
You write one JSON file; the scripts and tests check it for you.

## 1. Decide before you write

- **The problem.** One small, clear task read from standard input, answered on
  standard output. Easy problems take one idea; the main concept should be the
  thing the player is learning.
- **The module and the order.** The module is the group it belongs to (for
  example `python-basics`). The order is its position in that module, starting
  at 1. Two encounters in one module cannot share an order.
- **The concept tags.** Pick from `encounters/concepts.json`. The **first tag
  is the main concept**: it is the one named when a player loses. If you need
  a tag that is not in the list, ask Backend 1 to add it; do not invent one.

## 2. Create the file

Once, from the `backend/` folder (Python 3.10 to 3.12 works; 3.14 does not
work with the pinned packages):

```bash
python -m venv .venv
. .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Then scaffold an encounter:

```bash
python scripts/new_encounter.py py-004 "Reverse a String" --module python-basics --order 4 --concepts loops input-output
```

This creates `encounters/python/py-004/v1.json` with a `TODO` in every place
you must fill. The id looks like `py-004`: letters, a dash, three digits.
Look at `encounters/python/py-001/v1.json` as a finished example.

## 3. Fill in the fields

| Field | What goes there |
| --- | --- |
| `title` | Short name shown to the player. |
| `difficulty` | `easy`, `medium` or `hard`. |
| `problem` | What to do, what the input looks like, what to print. Give a full example in words, not just "solve it". |
| `starter_code` | What the player starts with. Comments saying what to do, and a place to write. |
| `tests.sample` | Two tests the player **can see** and run. 0 points each. |
| `tests.hidden` | Five tests the player **never sees**. 20 points each, so a full score is 100. |
| `limits.timeout_ms` | Time allowed per test. The default of 2000 is fine for easy problems. |
| `hints` | Exactly three levels, `"1"`, `"2"` and `"3"`. See section 5. |
| `failure_explanation` | What a wrong answer probably got wrong. See section 5. |

## 4. Writing good tests

- Each test has an `input` (what the program reads) and an `expected_output`
  (what it must print). The comparison ignores spaces at the end of a line and
  blank lines at the end, but otherwise must match exactly, including capital
  letters.
- The **samples** show the basic idea. The **hidden tests** are where the
  catches live: zero, negative numbers, the smallest and largest values, one
  item, many items, the usual off-by-one. Do not just repeat the samples with
  other numbers.
- A hidden test is never shown to the player, in the problem text, the
  hints or the explanation. Section 5 says how that is checked.
- A good habit: write two or three **wrong programs** that a beginner would
  write, and make sure at least one hidden test fails each of them.

## 5. Hints and the explanation

The three hints get more helpful as the player asks, and each one costs more:

1. **A nudge.** Points at what to think about. Does not name the technique.
2. **The approach.** Names the technique or tool to use.
3. **The walkthrough.** The full solution. Write it as a **short piece of
   Python that works**, ideally one or two lines. A test runs it against the
   encounter's own tests, so it also proves your tests are right.

The **failure explanation** is shown to a player when they lose, for any kind of
failure (wrong answer, an error, running too long). Write it about the likely
mistake in terms of the main concept, for example "Make sure your loop includes
N itself". It must be useful to a player who has not seen the hidden tests.

**Do not quote hidden tests.** The explanation and hints 1 and 2 must not
contain a hidden test's input or expected output (for values of two or more
characters that the problem or a sample does not already show). A test fails
if they do. Describe the kind of case ("your check has to work for every
integer") instead of naming it ("-8 is Even").

## 6. Check your work

From `backend/`, with the virtual environment active:

```bash
python scripts/seed_encounters.py
pytest tests/unit
```

The first checks every encounter file: it is valid, uses only agreed concept
tags, its order is not already taken, and no `TODO` is left from the stub. The
second also checks that hint 3 passes all tests and that nothing quotes a
hidden test. Fix anything marked `FAIL` before you open a pull request. A stub
you have not finished yet makes both fail on purpose.

## 7. Send it for review

Follow `CONTRIBUTING.md`: a branch named like `backend/py-004-reverse-string`,
a pull request titled like `D26 backend: encounter py-004 reverse a string`,
and say in the pull request which encounters you added. The owner of the
encounters (Backend 1) is the natural reviewer. Merging to `main` deploys to
staging.

## Changing an encounter after it has been played

The service uses the file with the highest version number. To change a
published encounter, add `v2.json` next to `v1.json` and leave `v1.json`
alone. Small fixes before anyone has played it can edit `v1.json`; ask Backend
1 if you are not sure which case you are in.
