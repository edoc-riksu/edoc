"""Day 51 bug fixes.

The unfiltered encounter list put modules in alphabetical order (conditions,
lists, loops, python-basics, strings), but a player meets them in the order the
seed writes: by the lowest encounter id each module holds (python-basics,
loops, conditions, strings, lists). The list must say the same thing.
"""

import json

from app.services.encounter_service import EncounterService


def _module_order(encounters):
    seen = []
    for e in encounters:
        if e.module not in seen:
            seen.append(e.module)
    return seen


def test_unfiltered_list_puts_modules_in_play_order(encounters_dir):
    listed = EncounterService(encounters_dir).list_encounters()
    modules = _module_order(listed)

    lowest = {}
    for e in listed:
        lowest[e.module] = min(e.id, lowest.get(e.module, e.id))
    assert modules == sorted(modules, key=lambda m: lowest[m])
    assert modules[0] == "python-basics"  # holds py-001, the first thing a player meets


def test_each_module_stays_in_one_block_in_the_list(encounters_dir):
    listed = EncounterService(encounters_dir).list_encounters()
    blocks = [e.module for i, e in enumerate(listed) if i == 0 or listed[i - 1].module != e.module]
    assert len(blocks) == len(set(blocks)), f"a module is split up in the list: {blocks}"
    for module in set(e.module for e in listed):
        orders = [e.order for e in listed if e.module == module]
        assert orders == sorted(orders)


def test_module_order_follows_ids_not_names(tmp_path):
    """Two modules whose names sort the opposite way to their ids."""
    root = tmp_path / "encounters"
    base = {
        "version": 1, "language": "python", "difficulty": "easy", "concepts": ["input-output"],
        "problem": "p", "starter_code": "", "tests": {"sample": [], "hidden": []},
        "hints": {"1": "a", "2": "b", "3": "c"}, "failure_explanation": "x",
    }
    for enc_id, module in (("py-001", "zebra"), ("py-002", "apple")):
        d = root / "python" / enc_id
        d.mkdir(parents=True)
        (d / "v1.json").write_text(json.dumps({**base, "id": enc_id, "title": enc_id, "module": module, "order": 1}))
    listed = EncounterService(root).list_encounters()
    assert [e.id for e in listed] == ["py-001", "py-002"]
