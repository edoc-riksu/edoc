/**
 * Approach encounters per planet. Mock data with the same shape the encounter API will serve,
 * so the screen can swap to real data without changing.
 */
export const APPROACH = {
  python: {
    name: "Python",
    course: ["Setting course for Python…", "Sensors show rocks ahead.", "Brace for the approach."],
    encounters: [
      {
        id: "drifting-pod",
        title: "Drifting cargo pod",
        blurb: "Read the label on the pod and keep it in a variable so you can call it back.",
        concept: { id: "variables", name: "variables", note: "A name that holds a value you can use again." },
        rock: 0
      },
      {
        id: "asteroid-field",
        title: "Asteroid field",
        blurb: "Plot a safe path by writing a loop that checks each gap.",
        concept: { id: "for-loops", name: "for loops", note: "Repeat one action for every item in a list." },
        rock: 1
      }
    ]
  }
};
