
export const APPROACH = {
  python: {
    name: "Python",
    course: ["Setting course for Python…", "Sensors show rocks ahead.", "Brace for the approach."],
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
      },
      {
        id: "py-004",
        title: "Sum of N Numbers",
        blurb:
          "Read a positive integer N, then read a second line with N integers separated by spaces. Print their sum.",
        concept: {
          id: "loops",
          name: "loops",
          note: "Repeat an action for a sequence of values."
        },
        rock: 3,
        starterCode:
          "# Read N, then read N integers from the next line.\n# Print their sum.\n\n# Write your code here\n",
        example: "Input: 3, then 1 2 3 → Output: 6",
        constraints: [
          "Read N first, then the N numbers on the next line",
          "Convert every value to an integer before summing"
        ],
        tests: [
          {
            description: "Input 3 then 1 2 3 should produce 6",
            input: "3\n1 2 3",
            expectedOutput: "6"
          },
          {
            description: "Input 1 then 10 should produce 10",
            input: "1\n10",
            expectedOutput: "10"
          }
        ],
        hints: [
          "Think about reading N first, then a separate line holding N numbers together.",
          "input().split() on the second line gives you a list of strings - convert each to int, then use sum() or a loop with a running total.",
          "n = int(input()); nums = map(int, input().split()); print(sum(nums))"
        ],
        explanation:
          "Read N, then read the second line and split it into N integers. Convert each to int and sum them.",
        solution:
          "n = int(input())\nnums = map(int, input().split())\nprint(sum(nums))"
      },
      {
        id: "py-005",
        title: "Largest of Three",
        blurb:
          "Given three integers on a single line of input, separated by spaces, print the largest of the three.",
        concept: {
          id: "conditionals",
          name: "conditionals",
          note: "Choose an action based on a condition."
        },
        rock: 4,
        starterCode:
          "# Read three integers from a single line of input, separated by spaces.\n# Print the largest one.\n\n# Write your code here\n",
        example: "Input: 3 7 5 → Output: 7",
        constraints: [
          "Read all three integers from one line",
          "Handle ties and negative numbers correctly"
        ],
        tests: [
          {
            description: "Input 3 7 5 should produce 7",
            input: "3 7 5",
            expectedOutput: "7"
          },
          {
            description: "Input 9 2 4 should produce 9",
            input: "9 2 4",
            expectedOutput: "9"
          }
        ],
        hints: [
          "Think about comparing the three numbers two at a time, or using a built-in that finds the biggest of several values.",
          "Python's max() function can take three arguments directly: max(a, b, c).",
          "a, b, c = map(int, input().split()); print(max(a, b, c))"
        ],
        explanation:
          "Read the three integers and use max() to find the largest, then print it.",
        solution:
          "a, b, c = map(int, input().split())\nprint(max(a, b, c))"
      },
      {
        id: "py-006",
        title: "Count Vowels",
        blurb:
          "Given a single line of lowercase text, print how many of its characters are vowels (a, e, i, o, u).",
        concept: {
          id: "loops",
          name: "loops",
          note: "Repeat an action for a sequence of values."
        },
        rock: 5,
        starterCode:
          "# Read a line of lowercase text.\n# Print how many of its characters are vowels (a, e, i, o, u).\n\n# Write your code here\n",
        example: "Input: hello world → Output: 3",
        constraints: [
          "Count every vowel occurrence, not just the distinct letters",
          "Treat a, e, i, o, u as the only vowels"
        ],
        tests: [
          {
            description: "Input hello world should produce 3",
            input: "hello world",
            expectedOutput: "3"
          },
          {
            description: "Input sky should produce 0",
            input: "sky",
            expectedOutput: "0"
          }
        ],
        hints: [
          "Think about checking each character of the line one at a time and keeping a running count.",
          "Loop over the string directly (for ch in line), and check whether each character is a, e, i, o, or u.",
          "line = input(); print(sum(1 for ch in line if ch in 'aeiou'))"
        ],
        explanation:
          "Loop over each character in the line and count how many are in the set a, e, i, o, u.",
        solution:
          "line = input()\nprint(sum(1 for ch in line if ch in 'aeiou'))"
      },
      {
        id: "py-007",
        title: "Fizz Buzz",
        blurb:
          "Given a positive integer N, print the numbers from 1 to N, one per line. For multiples of 3 print \"Fizz\", for multiples of 5 print \"Buzz\", and for multiples of both print \"FizzBuzz\".",
        concept: {
          id: "loops",
          name: "loops",
          note: "Repeat an action for a sequence of values."
        },
        rock: 6,
        starterCode:
          "# Read a positive integer N.\n# Print 1 to N, one per line, replacing multiples of 3 with \"Fizz\",\n# multiples of 5 with \"Buzz\", and multiples of both with \"FizzBuzz\".\n\n# Write your code here\n",
        example: "Input: 5 → Output: 1, 2, Fizz, 4, Buzz (each on a new line)",
        constraints: [
          "Check divisible by both 3 and 5 before checking either alone",
          "Print each result on its own line"
        ],
        tests: [
          {
            description: "Input 5 should print 1, 2, Fizz, 4, Buzz",
            input: "5",
            expectedOutput: "1\n2\nFizz\n4\nBuzz"
          },
          {
            description: "Input 15 should include FizzBuzz for 15",
            input: "15",
            expectedOutput: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz"
          }
        ],
        hints: [
          "Think about checking \"both 3 and 5\" before checking either one alone.",
          "Check divisibility by 15 first (both 3 and 5), then 3, then 5, then fall back to the number itself - order matters.",
          "for i in range(1, int(input()) + 1):\n    if i % 15 == 0: print('FizzBuzz')\n    elif i % 3 == 0: print('Fizz')\n    elif i % 5 == 0: print('Buzz')\n    else: print(i)"
        ],
        explanation:
          "Loop from 1 to N. Check divisibility by 15 first, then 3, then 5, printing FizzBuzz, Fizz, or Buzz accordingly, and the number itself otherwise.",
        solution:
          "for i in range(1, int(input()) + 1):\n    if i % 15 == 0:\n        print('FizzBuzz')\n    elif i % 3 == 0:\n        print('Fizz')\n    elif i % 5 == 0:\n        print('Buzz')\n    else:\n        print(i)"
      }
    ]
  }
};
