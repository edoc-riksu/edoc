/**
 * Approach encounters per planet. Mock data with the same shape the encounter API will serve,
 * so the screen can swap to real data without changing.
 */
export const APPROACH = {
  python: {
    name: "Python",
    encounters: [
      {
        id: "drifting-pod",
        title: "Drifting cargo pod",
        blurb: "Read the label on the pod and keep it in a variable so you can call it back.",
        concept: { id: "variables", name: "variables", note: "A name that holds a value you can use again." },
        rock: 0,
        starterCode:
          "# The pod's transponder gives up its label when you call read_label().\n# Store what it returns in a variable named cargo_id.\n\ncargo_id = None\n",
        tests: [
          {
            description: "cargo_id holds the pod's label",
            setup: "def read_label():\n    return 'CARGO-7742-ALPHA'",
            check: "'cargo_id' in globals() and cargo_id == read_label()"
          },
          {
            description: "cargo_id is a string, not a call left unresolved",
            setup: "def read_label():\n    return 'CARGO-7742-ALPHA'",
            check: "isinstance(cargo_id, str)"
          }
        ],
        hints: [
          "Call read_label() and keep what it gives back — that's the 'keep it in a variable' part.",
          "A variable is just a name on the left of an equals sign: name = value.",
          "cargo_id = read_label()"
        ]
      },
      {
        id: "asteroid-field",
        title: "Asteroid field",
        blurb: "Plot a safe path by writing a loop that checks each gap.",
        concept: { id: "for-loops", name: "for loops", note: "Repeat one action for every item in a list." },
        rock: 1,
        starterCode:
          "# Mission control has already loaded gaps (a list of gap widths) and\n# SHIP_WIDTH into memory. Build safe_path: True where a gap is wide\n# enough to fly through, False otherwise.\n\nsafe_path = []\nfor gap in gaps:\n    pass\n",
        tests: [
          {
            description: "safe_path marks each wide-enough gap as safe",
            setup: "gaps = [4, 1, 6, 2, 8]\nSHIP_WIDTH = 3",
            check: "'safe_path' in globals() and safe_path == [True, False, True, False, True]"
          },
          {
            description: "safe_path holds up against a tighter field",
            setup: "gaps = [2, 2, 2]\nSHIP_WIDTH = 3",
            check: "'safe_path' in globals() and safe_path == [False, False, False]"
          }
        ],
        hints: [
          "A for loop looks at one gap at a time: for gap in gaps:",
          "Inside the loop, append True or False to safe_path depending on whether gap is wide enough for SHIP_WIDTH.",
          "safe_path.append(gap >= SHIP_WIDTH)"
        ]
      }
    ]
  }
};
