
export const APPROACH = {
  python: {
    name: "Python",
    encounters: [
      {
        id: "py-001",
        title: "Sum of Two Integers",
        blurb:
          "Read two integers from standard input and print their sum.",
        concept: {
          id: "input-output",
          name: "input/output",
          note: "Read input, process values, and print the result."
        },
        rock: 0,
        starterCode:
          "# Read two integers separated by a space.\n# Print their sum.\n\n# Write your code here\n",
        example: "Input: 2 3 → Output: 5",
        constraints: [
          "Read both integers from one line",
          "Print the sum, not just calculate it"
        ],
        tests: [
          {
            description: "Input 2 3 should produce 5",
            input: "2 3",
            expectedOutput: "5"
          },
          {
            description: "Input 10 -4 should produce 6",
            input: "10 -4",
            expectedOutput: "6"
          }
        ],
        hints: [
          "Read a line using input().",
          "Use map(int, input().split()) to parse both numbers.",
          "a, b = map(int, input().split()); print(a + b)"
        ],
        explanation:
          "Read the two values as integers, add them, and print the result.",
        solution:
          "a, b = map(int, input().split())\nprint(a + b)"
      },
      {
        id: "py-002",
        title: "Print Numbers 1 to N",
        blurb:
          "Read a positive integer N and print every integer from 1 through N on its own line.",
        concept: {
          id: "loops",
          name: "loops",
          note: "Repeat an action for a sequence of values."
        },
        rock: 1,
        starterCode:
          "# Read a positive integer N.\n# Print numbers from 1 through N.\n\n# Write your code here\n",
        example: "Input: 3 → Output: 1, 2, 3 (each on a new line)",
        constraints: [
          "Include N itself",
          "Print each number on a separate line"
        ],
        tests: [
          {
            description: "Input 3 should print 1 through 3",
            input: "3",
            expectedOutput: "1\n2\n3"
          },
          {
            description: "Input 1 should print 1",
            input: "1",
            expectedOutput: "1"
          }
        ],
        hints: [
          "Use a loop to count from 1 to N.",
          "Python's range excludes its ending value.",
          "for i in range(1, int(input()) + 1): print(i)"
        ],
        explanation:
          "Use range(1, N + 1) to include N. Print each number inside the loop.",
        solution:
          "for i in range(1, int(input()) + 1):\n    print(i)"
      },
      {
        id: "py-003",
        title: "Even or Odd",
        blurb:
          "Read an integer and print Even if it is even, or Odd if it is odd.",
        concept: {
          id: "conditionals",
          name: "conditionals",
          note: "Choose an action based on a condition."
        },
        rock: 2,
        starterCode:
          "# Read an integer.\n# Print Even or Odd.\n\n# Write your code here\n",
        example: "Input: 4 → Output: Even",
        constraints: [
          "Handle positive, negative, and zero values",
          "Print exactly Even or Odd"
        ],
        tests: [
          {
            description: "Input 4 should produce Even",
            input: "4",
            expectedOutput: "Even"
          },
          {
            description: "Input 7 should produce Odd",
            input: "7",
            expectedOutput: "Odd"
          }
        ],
        hints: [
          "Check whether the number is divisible by 2.",
          "The modulo operator % gives the remainder.",
          "n = int(input()); print('Even' if n % 2 == 0 else 'Odd')"
        ],
        explanation:
          "An integer is even when n % 2 equals zero; otherwise, it is odd.",
        solution:
          "n = int(input())\nprint('Even' if n % 2 == 0 else 'Odd')"
      }
    ]
  }
};
