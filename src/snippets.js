/*
 * snippets.js — the content bank, as DATA (not wired into UI).
 *
 * Each snippet: { id, tier, difficulty, topic, code, output, explanation, is_error, distractors }
 *   tier:        'core' (no imports) | 'library' (needs an import)
 *   difficulty:  'easy' | 'medium' | 'tricky'
 *   topic:       one concept tag (lists, strings, numbers, logic, dicts, sets, tuples,
 *                comprehensions, loops, functions, classes, mutability, exceptions, and library
 *                topics: collections, itertools, functools, math, random, datetime, json,
 *                statistics, numpy)
 *   output:      EXACT printed text — every snippet was actually executed in Python 3.14 under
 *                multiple hash seeds and is deterministic (see tools/verify_snippets.py). Multi-line
 *                output is joined with a real newline. For is_error snippets this is the EXCEPTION
 *                CLASS NAME (graded leniently).
 *   distractors: up to 3 plausible WRONG answers used to build MCQ options (correct + distractors,
 *                shuffled at runtime). If fewer than 3, the engine fills the rest at runtime.
 *   is_error:    true -> the snippet intentionally raises; lenient grading.
 *
 * To add content later: append an object, then run  npm run verify  to confirm the output is real
 * and deterministic. Nothing else needs to change.
 */

const SNIPPETS = [
  {
    id: 1, tier: "core", difficulty: "easy", topic: "lists", is_error: false,
    code: `nums = [3, 1, 2]
result = nums.sort()
print(result)
print(nums)`,
    output: `None
[1, 2, 3]`,
    explanation: `.sort() rearranges the list in place and returns nothing. The sorted list was in nums the whole time — result was never the right place to look.`,
    distractors: [
      `[1, 2, 3]
[1, 2, 3]`,
      `[1, 2, 3]
[3, 1, 2]`,
      `None
[3, 1, 2]`
    ]
  },
  {
    id: 2, tier: "core", difficulty: "easy", topic: "mutability", is_error: false,
    code: `a = [1, 2, 3]
b = a
b.append(4)
print(a)`,
    output: `[1, 2, 3, 4]`,
    explanation: `b = a doesn't copy the list, it just gives the same list a second name. Change it through either name and both "see" it.`,
    distractors: [
      `[1, 2, 3]`,
      `[1, 2, 3, 4, 4]`,
      `[4, 1, 2, 3]`
    ]
  },
  {
    id: 3, tier: "core", difficulty: "easy", topic: "lists", is_error: false,
    code: `nums = [10, 20, 30, 40, 50]
print(nums[::-1])`,
    output: `[50, 40, 30, 20, 10]`,
    explanation: `[::-1] means "walk the whole thing backward" — the standard one-liner for reversing anything sliceable.`,
    distractors: [
      `[10, 20, 30, 40, 50]`,
      `[50, 40, 30, 20]`,
      `[40, 30, 20, 10]`
    ]
  },
  {
    id: 4, tier: "core", difficulty: "easy", topic: "lists", is_error: false,
    code: `nums = [1, 2, 3]
print(nums[1:100])`,
    output: `[2, 3]`,
    explanation: `Slices are forgiving — ask for more than exists and Python hands back whatever's actually there instead of erroring.`,
    distractors: [
      `[2, 3, ... 100]`,
      `[1, 2, 3]`,
      `[]`
    ]
  },
  {
    id: 5, tier: "core", difficulty: "easy", topic: "logic", is_error: false,
    code: `print(True + True + False)`,
    output: `2`,
    explanation: `Booleans are a subtype of integers. True is 1, False is 0, and they add up exactly like numbers.`,
    distractors: [
      `1`,
      `3`,
      `True`
    ]
  },
  {
    id: 6, tier: "core", difficulty: "easy", topic: "strings", is_error: false,
    code: `print("ab" * 3)`,
    output: `ababab`,
    explanation: `Multiplying a string by a number repeats it that many times — the same trick works on lists.`,
    distractors: [
      `abababab`
    ]
  },
  {
    id: 7, tier: "core", difficulty: "easy", topic: "loops", is_error: false,
    code: `a = [1, 2, 3]
b = ['x', 'y']
print(list(zip(a, b)))`,
    output: `[(1, 'x'), (2, 'y')]`,
    explanation: `zip() pairs elements until the shortest input runs out, then stops. It never pads the short one or errors.`,
    distractors: [
      `[(1, 'x'), (2, 'y'), (3, None)]`,
      `[(1, 'x'), (2, 'y'), (3, '')]`,
      `[('x', 1), ('y', 2)]`
    ]
  },
  {
    id: 8, tier: "core", difficulty: "medium", topic: "functions", is_error: false,
    code: `def add_item(item, basket=[]):
    basket.append(item)
    return basket

print(add_item("apple"))
print(add_item("banana"))`,
    output: `['apple']
['apple', 'banana']`,
    explanation: `Default arguments are built once, when the function is defined — not fresh on every call. Every call that doesn't pass its own list shares that same one. The classic Python gotcha, and the original inspiration for this whole game.`,
    distractors: [
      `['apple']
['banana']`,
      `['apple']
['apple']`,
      `['apple', 'banana']
['apple', 'banana']`
    ]
  },
  {
    id: 9, tier: "core", difficulty: "medium", topic: "strings", is_error: false,
    code: `print("{0} {1} {0}".format("a", "b"))`,
    output: `a b a`,
    explanation: `{0} means "insert argument zero here" — you can reuse the same index as many times as you want.`,
    distractors: [
      `a b b`,
      `a b a b`,
      `0 1 0`
    ]
  },
  {
    id: 10, tier: "core", difficulty: "medium", topic: "numbers", is_error: false,
    code: `print(-7 // 2)`,
    output: `-4`,
    explanation: `// always rounds down, toward negative infinity, never toward zero. -7 / 2 is -3.5, and rounding down from there lands on -4, not -3.`,
    distractors: [
      `-3`,
      `-3.5`,
      `3`
    ]
  },
  {
    id: 11, tier: "core", difficulty: "medium", topic: "logic", is_error: false,
    code: `print(0 or "fallback")`,
    output: `fallback`,
    explanation: `or returns whichever operand actually decided the result, not a boolean. 0 is falsy, so Python moves on and hands back the next value as-is.`,
    distractors: [
      `0`,
      `True`,
      `False`
    ]
  },
  {
    id: 12, tier: "core", difficulty: "medium", topic: "numbers", is_error: false,
    code: `print(0.1 + 0.2 == 0.3)`,
    output: `False`,
    explanation: `Computers store decimals in binary, and 0.1/0.2 can't be represented exactly in it. The rounding error means the sum isn't quite 0.3 — this trips up every language, not just Python.`,
    distractors: [
      `True`,
      `0.3`,
      `0.30000000000000004`
    ]
  },
  {
    id: 13, tier: "core", difficulty: "medium", topic: "exceptions", is_error: true,
    code: `nums = [1, 2, 3]
print(nums[100])`,
    output: `IndexError`,
    explanation: `Unlike slicing, asking for one specific index that doesn't exist has no reasonable fallback, so Python raises instead of guessing. Run this right after #4 — same list, two very different reactions to "out of range."`,
    distractors: [
      `KeyError`,
      `ValueError`,
      `OutOfRangeError`
    ]
  },
  {
    id: 14, tier: "core", difficulty: "medium", topic: "loops", is_error: false,
    code: `items = ['a', 'b', 'c']
print(list(enumerate(items, start=1)))`,
    output: `[(1, 'a'), (2, 'b'), (3, 'c')]`,
    explanation: `start= only changes what number the counting begins at — the items themselves don't move.`,
    distractors: [
      `[(0, 'a'), (1, 'b'), (2, 'c')]`,
      `[(1, 'a'), (2, 'b'), (3, 'c'), (4, None)]`,
      `[('a', 1), ('b', 2), ('c', 3)]`
    ]
  },
  {
    id: 15, tier: "core", difficulty: "tricky", topic: "functions", is_error: false,
    code: `funcs = []
for i in range(3):
    funcs.append(lambda: i)
print([f() for f in funcs])`,
    output: `[2, 2, 2]`,
    explanation: `A closure remembers the variable, not the value it held when created. By the time any lambda actually runs, the loop has finished and i is sitting at its final value, 2.`,
    distractors: [
      `[0, 1, 2]`,
      `[3, 3, 3]`,
      `[0, 0, 0]`
    ]
  },
  {
    id: 16, tier: "core", difficulty: "tricky", topic: "numbers", is_error: false,
    code: `print(round(2.5), round(3.5))`,
    output: `2 4`,
    explanation: `Python rounds .5 to the nearest even number ("banker's rounding"), not always up — a deliberate choice to avoid biasing data upward across many roundings.`,
    distractors: [
      `3 4`,
      `2 3`,
      `3 3`
    ]
  },
  {
    id: 17, tier: "core", difficulty: "tricky", topic: "dicts", is_error: false,
    code: `d = {1: "a", True: "b", 1.0: "c"}
print(d)`,
    output: `{1: 'c'}`,
    explanation: `1, True, and 1.0 all hash the same and compare equal, so a dictionary treats them as one key. Each line overwrites the value; the key keeps whichever form was inserted first.`,
    distractors: [
      `{1: 'a', True: 'b', 1.0: 'c'}`,
      `{1: 'a'}`,
      `{1: 'b'}`
    ]
  },
  {
    id: 18, tier: "core", difficulty: "tricky", topic: "mutability", is_error: false,
    code: `grid = [[0] * 3] * 3
grid[0][0] = 1
print(grid)`,
    output: `[[1, 0, 0], [1, 0, 0], [1, 0, 0]]`,
    explanation: `[[0]*3]*3 doesn't make three separate rows — it makes one row and repeats the same reference to it three times. Edit one "row" and you've edited all three.`,
    distractors: [
      `[[1, 0, 0], [0, 0, 0], [0, 0, 0]]`,
      `[[1, 1, 1], [0, 0, 0], [0, 0, 0]]`,
      `[[1, 0, 0]]`
    ]
  },
  {
    id: 19, tier: "core", difficulty: "tricky", topic: "classes", is_error: false,
    code: `class Dog:
    tricks = []
    def add_trick(self, trick):
        self.tricks.append(trick)

d1 = Dog()
d2 = Dog()
d1.add_trick("sit")
d2.add_trick("roll over")
print(d1.tricks)`,
    output: `['sit', 'roll over']`,
    explanation: `tricks is defined on the class itself, not inside __init__, so every Dog instance shares the exact same list unless explicitly given its own.`,
    distractors: [
      `['sit']`,
      `['roll over']`,
      `[]`
    ]
  },
  {
    id: 20, tier: "core", difficulty: "tricky", topic: "logic", is_error: false,
    code: `a = 1000
b = int("1000")
print(a == b)
print(a is b)`,
    output: `True
False`,
    explanation: `== checks if the values are equal; is checks if they're literally the same object in memory. Python pre-caches small integers, but 1000 is outside that range, and building it at runtime via int("1000") creates a genuinely separate object.`,
    distractors: [
      `True
True`,
      `False
False`,
      `False
True`
    ]
  },
  {
    id: 21, tier: "core", difficulty: "tricky", topic: "exceptions", is_error: true,
    code: `x = 10
def foo():
    print(x)
    x = 20
foo()`,
    output: `UnboundLocalError`,
    explanation: `Because x gets assigned somewhere inside foo, Python treats it as local to the whole function — including the print() line before that assignment runs. It tries to read a local x that doesn't exist yet instead of falling back to the outer one.`,
    distractors: [
      `NameError`,
      `ValueError`,
      `TypeError`
    ]
  },
  {
    id: 22, tier: "library", difficulty: "easy", topic: "random", is_error: false,
    code: `import random
random.seed(42)
print(random.randint(1, 100))`,
    output: `82`,
    explanation: `random.seed() locks the generator to one specific, repeatable sequence. Same seed, same "random" number, every time — a great "wait, that's not actually random?!" moment.`,
    distractors: [
      `42`,
      `7`,
      `63`
    ]
  },
  {
    id: 23, tier: "library", difficulty: "medium", topic: "random", is_error: false,
    code: `import random
random.seed(7)
nums = [1, 2, 3, 4, 5]
random.shuffle(nums)
print(nums)`,
    output: `[5, 1, 4, 2, 3]`,
    explanation: `Same idea applied to shuffle() — the "randomness" is completely fixed once the seed is set.`,
    distractors: [
      `[1, 2, 3, 4, 5]`,
      `[3, 1, 4, 5, 2]`,
      `[5, 4, 3, 2, 1]`
    ]
  },
  {
    id: 24, tier: "library", difficulty: "easy", topic: "numpy", is_error: false,
    code: `import numpy as np
arr = np.array([1, 2, 3])
print(arr)`,
    output: `[1 2 3]`,
    explanation: `NumPy prints arrays with spaces, not commas — a different animal from a regular Python list.`,
    distractors: [
      `[1, 2, 3]`,
      `array([1, 2, 3])`,
      `1 2 3`
    ]
  },
  {
    id: 25, tier: "library", difficulty: "easy", topic: "numpy", is_error: false,
    code: `import numpy as np
arr = np.array([1, 2, 3])
print(arr * 2)`,
    output: `[2 4 6]`,
    explanation: `NumPy applies the operation to every element at once, no loop required — "broadcasting," the entire reason people reach for NumPy.`,
    distractors: [
      `[1 2 3 1 2 3]`,
      `[2, 4, 6]`,
      `[1 2 3]`
    ]
  },
  {
    id: 26, tier: "library", difficulty: "medium", topic: "numpy", is_error: false,
    code: `import numpy as np
arr = np.array([1, 2, 3, 4, 5])
print(arr[arr > 2])`,
    output: `[3 4 5]`,
    explanation: `arr > 2 builds a same-shaped True/False mask, and indexing with that mask keeps only the elements where it's True.`,
    distractors: [
      `[2 3 4 5]`,
      `[True True True]`,
      `[3, 4, 5]`
    ]
  },
  {
    id: 27, tier: "library", difficulty: "easy", topic: "collections", is_error: false,
    code: `from collections import Counter
words = ["a", "b", "a", "c", "b", "a"]
print(Counter(words))`,
    output: `Counter({'a': 3, 'b': 2, 'c': 1})`,
    explanation: `Counter tallies how often each item appears, and its printed form lists them most-common first.`,
    distractors: [
      `Counter({'a': 3, 'b': 2, 'c': 1, 'd': 0})`,
      `{'a': 3, 'b': 2, 'c': 1}`,
      `Counter({'a': 2, 'b': 2, 'c': 1})`
    ]
  },
  {
    id: 28, tier: "library", difficulty: "easy", topic: "itertools", is_error: false,
    code: `from itertools import permutations
print(len(list(permutations([1, 2, 3]))))`,
    output: `6`,
    explanation: `Three items have 3! (3x2x1) possible orderings — this just counts how many permutations generates.`,
    distractors: [
      `3`,
      `9`,
      `12`
    ]
  },
  {
    id: 29, tier: "library", difficulty: "easy", topic: "math", is_error: false,
    code: `import math
print(math.gcd(48, 18))`,
    output: `6`,
    explanation: `math.gcd finds the largest number that divides both inputs evenly.`,
    distractors: [
      `3`,
      `2`,
      `864`
    ]
  },
  {
    id: 30, tier: "library", difficulty: "medium", topic: "datetime", is_error: false,
    code: `from datetime import date
d1 = date(2024, 1, 31)
d2 = date(2024, 3, 1)
print((d2 - d1).days)`,
    output: `30`,
    explanation: `Subtracting two date objects gives a timedelta; .days is the plain count between them. 2024 was a leap year — exactly the kind of detail that trips up mental math but not Python's date arithmetic.`,
    distractors: [
      `29`,
      `31`,
      `28`
    ]
  },
  {
    id: 31, tier: "library", difficulty: "medium", topic: "json", is_error: false,
    code: `import json
data = {"b": 2, "a": 1}
print(json.dumps(data))`,
    output: `{"b": 2, "a": 1}`,
    explanation: `json.dumps() serializes a dict in insertion order by default — it does not alphabetize keys unless you pass sort_keys=True.`,
    distractors: [
      `{"a": 1, "b": 2}`
    ]
  },
  {
    id: 32, tier: "library", difficulty: "easy", topic: "statistics", is_error: false,
    code: `import statistics
print(statistics.mean([1, 2, 3, 4]))`,
    output: `2.5`,
    explanation: `Add them up, divide by how many there are. Mostly here so kids discover the statistics module exists instead of hand-rolling sum(x)/len(x) forever.`,
    distractors: [
      `2`,
      `2.0`,
      `3`
    ]
  },
  {
    id: 33, tier: "core", difficulty: "easy", topic: "lists", is_error: false,
    code: `nums = [10, 20, 30, 40, 50]
print(nums[1:4])`,
    output: `[20, 30, 40]`,
    explanation: `Slicing [1:4] grabs items starting at index 1 up to but NOT including index 4, so you get the three middle numbers.`,
    distractors: [
      `[20, 30, 40, 50]`,
      `[30, 40]`,
      `[20, 30]`
    ]
  },
  {
    id: 34, tier: "core", difficulty: "easy", topic: "lists", is_error: false,
    code: `nums = [10, 20, 30, 40, 50]
print(nums[-2])`,
    output: `40`,
    explanation: `A negative index counts from the end, so -1 is the last item and -2 is the second-to-last.`,
    distractors: [
      `50`,
      `30`,
      `20`
    ]
  },
  {
    id: 35, tier: "core", difficulty: "medium", topic: "lists", is_error: false,
    code: `letters = ['a', 'b', 'c', 'd', 'e']
print(letters[::2])`,
    output: `['a', 'c', 'e']`,
    explanation: `The third slice number is the step, so [::2] takes every other item starting from the first.`,
    distractors: [
      `['b', 'd']`,
      `['a', 'c', 'e', 'g']`,
      `['a', 'b', 'c']`
    ]
  },
  {
    id: 36, tier: "core", difficulty: "medium", topic: "lists", is_error: false,
    code: `nums = [1, 2, 3]
nums.append([4, 5])
print(nums)
print(len(nums))`,
    output: `[1, 2, 3, [4, 5]]
4`,
    explanation: `append adds its argument as ONE single item, so the whole [4, 5] becomes one nested element and the length only goes up by one.`,
    distractors: [
      `[1, 2, 3, 4, 5]
5`,
      `[1, 2, 3, [4, 5]]
5`,
      `[1, 2, 3, 4, 5]
4`
    ]
  },
  {
    id: 37, tier: "core", difficulty: "medium", topic: "lists", is_error: false,
    code: `nums = [1, 2, 3]
nums.extend([4, 5])
print(nums)
print(len(nums))`,
    output: `[1, 2, 3, 4, 5]
5`,
    explanation: `extend pulls the items OUT of the other list and adds them one by one, unlike append which would nest the whole list.`,
    distractors: [
      `[1, 2, 3, [4, 5]]
4`,
      `[1, 2, 3, [4, 5]]
5`,
      `[1, 2, 3, 4, 5]
4`
    ]
  },
  {
    id: 38, tier: "core", difficulty: "tricky", topic: "lists", is_error: false,
    code: `nums = [3, 1, 2]
result = nums.insert(1, 99)
print(nums)
print(result)`,
    output: `[3, 99, 1, 2]
None`,
    explanation: `insert changes the list in place and returns None, so it slides 99 into position 1 but the saved result is just None.`,
    distractors: [
      `[3, 99, 1, 2]
[3, 99, 1, 2]`,
      `[3, 1, 99, 2]
None`,
      `[99, 3, 1, 2]
None`
    ]
  },
  {
    id: 39, tier: "core", difficulty: "easy", topic: "lists", is_error: false,
    code: `nums = [5, 3, 8, 1]
x = nums.pop()
print(x)
print(nums)`,
    output: `1
[5, 3, 8]`,
    explanation: `pop() with no number removes and hands back the LAST item, leaving the rest of the list behind.`,
    distractors: [
      `5
[3, 8, 1]`,
      `1
[5, 3, 8, 1]`,
      `8
[5, 3, 1]`
    ]
  },
  {
    id: 40, tier: "core", difficulty: "tricky", topic: "lists", is_error: false,
    code: `a = [1, 2, 3]
b = a[:]
b.append(4)
print(a)
print(b)`,
    output: `[1, 2, 3]
[1, 2, 3, 4]`,
    explanation: `a[:] makes a real copy, so b is its own separate list and adding to b leaves the original a untouched.`,
    distractors: [
      `[1, 2, 3, 4]
[1, 2, 3, 4]`,
      `[1, 2, 3]
[1, 2, 3]`,
      `[1, 2, 3, 4]
[1, 2, 3]`
    ]
  },
  {
    id: 41, tier: "core", difficulty: "tricky", topic: "tuples", is_error: false,
    code: `t = (7,)
print(type(t).__name__)
x = (7)
print(type(x).__name__)`,
    output: `tuple
int`,
    explanation: `It's the comma, not the parentheses, that makes a tuple, so (7,) is a tuple but plain (7) is just the number 7 in brackets.`,
    distractors: [
      `int
tuple`,
      `tuple
tuple`,
      `int
int`
    ]
  },
  {
    id: 42, tier: "core", difficulty: "medium", topic: "tuples", is_error: false,
    code: `a, b, *rest = [1, 2, 3, 4, 5]
print(a, b)
print(rest)`,
    output: `1 2
[3, 4, 5]`,
    explanation: `The starred *rest scoops up everything left over after a and b take the first two, and it always comes out as a list.`,
    distractors: [
      `1 2
(3, 4, 5)`,
      `1 2
3`,
      `1 2 3
[4, 5]`
    ]
  },
  {
    id: 43, tier: "core", difficulty: "tricky", topic: "tuples", is_error: false,
    code: `a, b = 1, 2
a, b = b, a + b
print(a, b)`,
    output: `2 3`,
    explanation: `Python builds the whole right side first using the OLD values, so b stays 2 for a, and a+b uses old 1+2 for the new b.`,
    distractors: [
      `2 4`,
      `3 2`,
      `1 3`
    ]
  },
  {
    id: 44, tier: "core", difficulty: "easy", topic: "tuples", is_error: false,
    code: `point = (3, 4)
x, y = point
print(x + y)`,
    output: `7`,
    explanation: `Unpacking spreads the tuple's two values into x and y, so 3 and 4 add up to 7.`,
    distractors: [
      `12`,
      `(3, 4)`,
      `34`
    ]
  },
  {
    id: 45, tier: "core", difficulty: "tricky", topic: "tuples", is_error: false,
    code: `t = (1, 2, [3, 4])
t[2].append(5)
print(t)`,
    output: `(1, 2, [3, 4, 5])`,
    explanation: `A tuple can't be reassigned, but the LIST stored inside it is still changeable, so we can append to it without breaking the rules.`,
    distractors: [
      `TypeError`,
      `(1, 2, [3, 4])`,
      `(1, 2, [5])`
    ]
  },
  {
    id: 46, tier: "core", difficulty: "tricky", topic: "lists", is_error: false,
    code: `nums = [1, 2, 3, 4, 5]
nums[1:3] = [20]
print(nums)`,
    output: `[1, 20, 4, 5]`,
    explanation: `Assigning to a slice replaces that whole chunk, so the two items at positions 1 and 2 get swapped out for the single value 20.`,
    distractors: [
      `[1, 20, 3, 4, 5]`,
      `[1, 20, 4, 5, 5]`,
      `[1, [20], 4, 5]`
    ]
  },
  {
    id: 47, tier: "core", difficulty: "easy", topic: "lists", is_error: false,
    code: `word = 'hello'
chars = list(word)
print(chars)
print(chars.index('l'))`,
    output: `['h', 'e', 'l', 'l', 'o']
2`,
    explanation: `list() on a string splits it into single characters, and .index finds the FIRST spot where 'l' appears.`,
    distractors: [
      `['h', 'e', 'l', 'l', 'o']
3`,
      `['h', 'e', 'l', 'l', 'o']
[2, 3]`,
      `'hello'
2`
    ]
  },
  {
    id: 48, tier: "core", difficulty: "easy", topic: "strings", is_error: false,
    code: `s = "hello world"
print(s[::-1])`,
    output: `dlrow olleh`,
    explanation: `The slice [::-1] walks the whole string backwards one step at a time, so every character flips into reverse order, spaces included.`,
    distractors: [
      `olleh dlrow`,
      `hello world`
    ]
  },
  {
    id: 49, tier: "core", difficulty: "medium", topic: "strings", is_error: false,
    code: `s = "banana"
print(s.replace("a", "o", 2))`,
    output: `bonona`,
    explanation: `The third argument tells replace to swap only the FIRST 2 'a's, so the last 'a' is left untouched.`,
    distractors: [
      `bonana`,
      `ononon`,
      `bonono`
    ]
  },
  {
    id: 50, tier: "core", difficulty: "easy", topic: "strings", is_error: false,
    code: `parts = "a,b,c,d".split(",")
print("-".join(parts))`,
    output: `a-b-c-d`,
    explanation: `split breaks the string into a list at every comma, then join glues those pieces back together using a dash instead.`,
    distractors: [
      `a,b,c,d`,
      `['a', 'b', 'c', 'd']`,
      `abcd`
    ]
  },
  {
    id: 51, tier: "core", difficulty: "medium", topic: "strings", is_error: false,
    code: `word = "Mississippi"
print(word.count("ss"))`,
    output: `2`,
    explanation: `count looks for the pattern 'ss' without overlapping, and Mississippi has exactly two separate 'ss' pairs.`,
    distractors: [
      `4`,
      `1`,
      `3`
    ]
  },
  {
    id: 52, tier: "core", difficulty: "medium", topic: "strings", is_error: false,
    code: `print("abcdef"[1:5:2])`,
    output: `bd`,
    explanation: `Start at index 1, stop before index 5, and step by 2, so it grabs the 'b' then skips to 'd'.`,
    distractors: [
      `bc`,
      `bce`,
      `ace`
    ]
  },
  {
    id: 53, tier: "core", difficulty: "medium", topic: "strings", is_error: false,
    code: `print("Hello".find("l"), "Hello".find("z"))`,
    output: `2 -1`,
    explanation: `find returns the index of the first match (the first 'l' is at position 2), but returns -1 when the character isn't there at all.`,
    distractors: [
      `2 0`,
      `3 -1`,
      `3 0`
    ]
  },
  {
    id: 54, tier: "core", difficulty: "easy", topic: "strings", is_error: false,
    code: `name = "Sam"
s = "Hi"
s += " " + name
print(s, len(s))`,
    output: `Hi Sam 6`,
    explanation: `The += stitches the strings together into 'Hi Sam', which is 6 characters (H, i, space, S, a, m). Then print(s, len(s)) prints both values with its default space separator in between, giving 'Hi Sam 6'.`,
    distractors: [
      `Hi Sam 7`,
      `Hi Sam 5`
    ]
  },
  {
    id: 55, tier: "core", difficulty: "tricky", topic: "strings", is_error: false,
    code: `print("Python".lower().title())`,
    output: `Python`,
    explanation: `lower makes it 'python', then title capitalizes the first letter of each word, bringing the P right back so it looks unchanged.`,
    distractors: [
      `python`,
      `PYTHON`,
      `PYthon`
    ]
  },
  {
    id: 56, tier: "core", difficulty: "easy", topic: "strings", is_error: false,
    code: `x = 7
print(f"{x} squared is {x*x}")`,
    output: `7 squared is 49`,
    explanation: `An f-string runs the code inside each {} and drops the result into the text, so x*x becomes 49.`,
    distractors: [
      `7 squared is 14`,
      `x squared is x*x`,
      `7 squared is {x*x}`
    ]
  },
  {
    id: 57, tier: "core", difficulty: "medium", topic: "strings", is_error: false,
    code: `print("one two three".split())`,
    output: `['one', 'two', 'three']`,
    explanation: `Calling split with no argument breaks on whitespace and gives back a LIST, which prints with brackets and quotes around each word.`,
    distractors: [
      `['one two three']`,
      `one two three`
    ]
  },
  {
    id: 58, tier: "core", difficulty: "medium", topic: "strings", is_error: false,
    code: `print("racecar"[1:-1])`,
    output: `aceca`,
    explanation: `Index 1 starts after the first letter and -1 stops just before the last, so it trims one character off each end.`,
    distractors: [
      `acecar`,
      `raceca`,
      `acec`
    ]
  },
  {
    id: 59, tier: "core", difficulty: "easy", topic: "strings", is_error: false,
    code: `print("Hello, World".swapcase())`,
    output: `hELLO, wORLD`,
    explanation: `swapcase flips every letter's case, so capitals become lowercase and lowercase become capitals while the comma and space stay put.`,
    distractors: [
      `Hello, World`,
      `HELLO, WORLD`,
      `hello, world`
    ]
  },
  {
    id: 60, tier: "core", difficulty: "easy", topic: "numbers", is_error: false,
    code: `print(7 / 2)
print(8 / 2)
print(8 // 2)`,
    output: `3.5
4.0
4`,
    explanation: `A single slash always gives a float, so even 8 / 2 prints 4.0 (not 4). The double slash // does floor division and stays an int, so 8 // 2 is 4.`,
    distractors: []
  },
  {
    id: 61, tier: "core", difficulty: "tricky", topic: "numbers", is_error: false,
    code: `print(-7 % 3)
print(7 % -3)`,
    output: `2
-2`,
    explanation: `In Python the result of % always takes the sign of the divisor (the right number), not the dividend. So -7 % 3 is a positive 2, while 7 % -3 is a negative -2.`,
    distractors: [
      `-1
1`,
      `1
-1`,
      `-2
2`
    ]
  },
  {
    id: 62, tier: "core", difficulty: "easy", topic: "numbers", is_error: false,
    code: `print(divmod(17, 5))`,
    output: `(3, 2)`,
    explanation: `divmod hands you both answers at once: how many times 5 fits into 17 (that's 3) and what's left over (that's 2), packed into a tuple.`,
    distractors: [
      `(2, 3)`,
      `3.4`,
      `(3.0, 2.0)`
    ]
  },
  {
    id: 63, tier: "core", difficulty: "medium", topic: "numbers", is_error: false,
    code: `print(2 ** 3 ** 2)`,
    output: `512`,
    explanation: `The ** power operator groups from the right, so this is 2 ** (3 ** 2) = 2 ** 9 = 512, not (2 ** 3) ** 2 which would be 64.`,
    distractors: [
      `64`,
      `262144`,
      `729`
    ]
  },
  {
    id: 64, tier: "core", difficulty: "medium", topic: "numbers", is_error: false,
    code: `print(10 ** -2)`,
    output: `0.01`,
    explanation: `A negative exponent means one over the power, so 10 ** -2 is 1/100. Because the answer isn't a whole number, Python gives you a float: 0.01.`,
    distractors: [
      `0.001`,
      `-100`,
      `100`
    ]
  },
  {
    id: 65, tier: "core", difficulty: "medium", topic: "numbers", is_error: false,
    code: `print(int(2.99))
print(int(-2.99))`,
    output: `2
-2`,
    explanation: `int() doesn't round, it just chops off everything after the decimal point (truncates toward zero). So 2.99 becomes 2 and -2.99 becomes -2.`,
    distractors: [
      `2
-3`,
      `3
-3`,
      `2
3`
    ]
  },
  {
    id: 66, tier: "core", difficulty: "tricky", topic: "numbers", is_error: false,
    code: `print(round(2.675, 2))`,
    output: `2.67`,
    explanation: `You'd expect 2.68, but 2.675 can't be stored exactly in binary floats and is actually a hair below 2.675, so rounding to 2 places gives 2.67.`,
    distractors: [
      `2.68`,
      `2.7`,
      `2.675`
    ]
  },
  {
    id: 67, tier: "core", difficulty: "tricky", topic: "numbers", is_error: false,
    code: `print(0.1 + 0.2)`,
    output: `0.30000000000000004`,
    explanation: `Computers store decimals in binary, and 0.1 and 0.2 can't be represented exactly, so their sum lands a tiny bit past 0.3 and Python shows the full messy result.`,
    distractors: [
      `0.3`,
      `0.30000000000000001`,
      `0.30000000000000002`
    ]
  },
  {
    id: 68, tier: "core", difficulty: "medium", topic: "numbers", is_error: false,
    code: `print(5 // 2 * 2 + 5 % 2)`,
    output: `5`,
    explanation: `5 // 2 is 2 and 2 * 2 is 4, then 5 % 2 (the remainder) is 1, so 4 + 1 brings you right back to 5. The floor-quotient and remainder always rebuild the original.`,
    distractors: [
      `4`,
      `6`,
      `7`
    ]
  },
  {
    id: 69, tier: "core", difficulty: "medium", topic: "numbers", is_error: false,
    code: `print(3 == 3.0)
print(3 + True)`,
    output: `True
4`,
    explanation: `An int and a float are equal when they're the same value, so 3 == 3.0 is True. And True secretly counts as 1, so 3 + True is 4.`,
    distractors: [
      `True
3`,
      `False
4`,
      `True
4.0`
    ]
  },
  {
    id: 70, tier: "core", difficulty: "tricky", topic: "numbers", is_error: false,
    code: `print(-3 ** 2)
print((-3) ** 2)`,
    output: `-9
9`,
    explanation: `** binds tighter than the minus sign, so -3 ** 2 is read as -(3 ** 2) = -9. Only with parentheses does (-3) ** 2 give the positive 9.`,
    distractors: [
      `9
9`,
      `-9
-9`,
      `9
-9`
    ]
  },
  {
    id: 71, tier: "core", difficulty: "medium", topic: "numbers", is_error: false,
    code: `print(7.0 // 2)
print(type(7.0 // 2).__name__)`,
    output: `3.0
float`,
    explanation: `Floor division rounds down to a whole number, but if either side is a float the result stays a float, so you get 3.0 and its type is float, not int.`,
    distractors: [
      `3
int`,
      `3.0
int`,
      `3
float`
    ]
  },
  {
    id: 72, tier: "core", difficulty: "easy", topic: "numbers", is_error: false,
    code: `print(100 / 4)
print(round(100 / 4))`,
    output: `25.0
25`,
    explanation: `Division with / always makes a float, so 100 / 4 is 25.0, but wrapping it in round() with no second argument hands back a clean int, 25.`,
    distractors: [
      `25
25`,
      `25.0
25.0`,
      `25
25.0`
    ]
  },
  {
    id: 73, tier: "core", difficulty: "medium", topic: "logic", is_error: false,
    code: `print([] or {} or 0 or "last")`,
    output: `last`,
    explanation: `With 'or', Python hands back the first truthy value it finds. Empty list, empty dict, and 0 are all falsy, so it falls all the way through to the string "last".`,
    distractors: [
      `[]`,
      `0`,
      `True`
    ]
  },
  {
    id: 74, tier: "core", difficulty: "medium", topic: "logic", is_error: false,
    code: `print("hi" and 0 and "bye")`,
    output: `0`,
    explanation: `With 'and', Python returns the first falsy value (or the last value if all are truthy). "hi" is truthy so it moves on, hits 0 which is falsy, and stops there.`,
    distractors: [
      `bye`,
      `hi`,
      `False`
    ]
  },
  {
    id: 75, tier: "core", difficulty: "easy", topic: "logic", is_error: false,
    code: `print(1 < 2 < 3)
print(3 > 2 > 1 > 0)`,
    output: `True
True`,
    explanation: `Python lets you chain comparisons like math class does: 1 < 2 < 3 means (1 < 2) and (2 < 3). Both chains are fully in order, so both are True.`,
    distractors: [
      `True
False`,
      `False
True`,
      `False
False`
    ]
  },
  {
    id: 76, tier: "core", difficulty: "tricky", topic: "logic", is_error: false,
    code: `print(5 < 10 > 2)
print(1 == 1 == True)`,
    output: `True
True`,
    explanation: `Chains don't all have to point the same way: 5 < 10 > 2 checks 5<10 AND 10>2, both True. And since True equals 1, the chain 1 == 1 == True is also all True.`,
    distractors: [
      `False
False`,
      `True
False`,
      `False
True`
    ]
  },
  {
    id: 77, tier: "core", difficulty: "easy", topic: "logic", is_error: false,
    code: `x = 0
print(x or "default")
y = 5
print(y and "yes")`,
    output: `default
yes`,
    explanation: `'x or "default"' is the classic fallback: 0 is falsy so you get "default". And 'y and "yes"' returns "yes" because 5 is truthy, so 'and' moves on to the second value.`,
    distractors: [
      `0
yes`,
      `default
True`,
      `0
5`
    ]
  },
  {
    id: 78, tier: "core", difficulty: "tricky", topic: "logic", is_error: false,
    code: `print(2 in [1, 2, 3])
print("ca" in "cat")
print(0 in [False, 1, 2])`,
    output: `True
True
True`,
    explanation: `'in' checks membership: 2 is in the list, and "ca" is a piece of "cat". The sneaky one is the last: 0 == False, so Python counts False in the list as a match for 0.`,
    distractors: [
      `True
True
False`,
      `True
False
True`,
      `False
True
True`
    ]
  },
  {
    id: 79, tier: "core", difficulty: "tricky", topic: "logic", is_error: false,
    code: `print([] == [])
print([] is [])
x = None
print(x is None)`,
    output: `True
False
True`,
    explanation: `'==' asks 'same contents?' so two empty lists are equal. 'is' asks 'the exact same object?' and these are two separate lists, so it's False. There's only one None, so 'x is None' is always True.`,
    distractors: [
      `False
True
True`,
      `True
True
True`,
      `False
False
True`
    ]
  },
  {
    id: 80, tier: "core", difficulty: "medium", topic: "logic", is_error: false,
    code: `print(bool([]), bool([0]), bool(""), bool(" "))`,
    output: `False True False True`,
    explanation: `Empty containers are falsy, but a container with stuff in it is truthy even if that stuff is 0. So [0] is True, and a string with just a space " " is True because it's not empty.`,
    distractors: [
      `False False False False`,
      `True True True True`,
      `False True False False`
    ]
  },
  {
    id: 81, tier: "core", difficulty: "medium", topic: "logic", is_error: false,
    code: `print(True + True + True)
print(True and 5)
print(False or 7)`,
    output: `3
5
7`,
    explanation: `Behind the scenes True works like the number 1, so True+True+True adds up to 3. The surprise is that 'and' and 'or' don't always give you True or False — they return one of the actual values they're given: True and 5 moves past the truthy True and hands back 5, while False or 7 skips the falsy False and hands back 7.`,
    distractors: [
      `3
True
True`,
      `3
5
True`,
      `True
5
7`
    ]
  },
  {
    id: 82, tier: "core", difficulty: "medium", topic: "logic", is_error: false,
    code: `print(not not "")
print(not 0)
print(not [1])`,
    output: `False
True
False`,
    explanation: `'not' always gives back a real True/False. "" is falsy so not not "" is False; 0 is falsy so not 0 is True; and [1] is truthy so not [1] is False.`,
    distractors: [
      `True
True
False`,
      `False
False
True`,
      `True
False
True`
    ]
  },
  {
    id: 83, tier: "core", difficulty: "tricky", topic: "logic", is_error: false,
    code: `print(1 < 2 == 2)
print(1 < 2 != 2)`,
    output: `True
False`,
    explanation: `These chain too: 1 < 2 == 2 means 1<2 AND 2==2, both True. But 1 < 2 != 2 means 1<2 AND 2!=2, and 2 really does equal 2, so that half is False.`,
    distractors: [
      `True
True`,
      `False
True`,
      `False
False`
    ]
  },
  {
    id: 84, tier: "core", difficulty: "easy", topic: "dicts", is_error: false,
    code: `d = {"a": 1, "b": 2}
print(d.get("c", 0))
print(d.get("a", 0))`,
    output: `0
1`,
    explanation: `get() hands back the default (0) when the key is missing, but the real value when the key is there. So "c" gives 0 and "a" gives 1.`,
    distractors: [
      `None
1`,
      `0
None`,
      `c
1`
    ]
  },
  {
    id: 85, tier: "core", difficulty: "tricky", topic: "dicts", is_error: false,
    code: `d = {}
d.setdefault("x", []).append(1)
d.setdefault("x", []).append(2)
print(d)`,
    output: `{'x': [1, 2]}`,
    explanation: `The first setdefault creates the empty list and returns it; the second one sees "x" already exists and returns that SAME list, so both appends land in one list.`,
    distractors: [
      `{'x': [2]}`,
      `{'x': [1], 'x': [2]}`,
      `{'x': 2}`
    ]
  },
  {
    id: 86, tier: "core", difficulty: "easy", topic: "dicts", is_error: false,
    code: `d = {"a": 1, "b": 2}
d.update({"b": 20, "c": 3})
print(d)`,
    output: `{'a': 1, 'b': 20, 'c': 3}`,
    explanation: `update() overwrites existing keys ("b" becomes 20) and adds brand-new ones ("c": 3), keeping the original order of the keys already there.`,
    distractors: [
      `{'a': 1, 'b': 2, 'c': 3}`,
      `{'a': 1, 'b': 2}`,
      `{'a': 1, 'b': 20}`
    ]
  },
  {
    id: 87, tier: "core", difficulty: "easy", topic: "dicts", is_error: false,
    code: `d = {"a": 1, "b": 2, "c": 3}
print(list(d.keys()))
print(list(d.values()))`,
    output: `['a', 'b', 'c']
[1, 2, 3]`,
    explanation: `A dict remembers the order you inserted things, so keys and values both come out in that same a, b, c order.`,
    distractors: [
      `['a', 'b', 'c']
['1', '2', '3']`,
      `[a, b, c]
[1, 2, 3]`,
      `dict_keys(['a', 'b', 'c'])
dict_values([1, 2, 3])`
    ]
  },
  {
    id: 88, tier: "core", difficulty: "medium", topic: "dicts", is_error: false,
    code: `d = {"x": 1}
v = d.setdefault("x", 99)
print(v)
print(d)`,
    output: `1
{'x': 1}`,
    explanation: `setdefault only fills in a value when the key is missing. "x" already equals 1, so the 99 is ignored and you get the existing 1 back.`,
    distractors: [
      `99
{'x': 99}`,
      `1
{'x': 99}`,
      `99
{'x': 1}`
    ]
  },
  {
    id: 89, tier: "core", difficulty: "tricky", topic: "dicts", is_error: false,
    code: `d = {"a": 1, "b": 2}
ks = d.keys()
d["c"] = 3
print(list(ks))`,
    output: `['a', 'b', 'c']`,
    explanation: `d.keys() is a live view, not a snapshot. Adding "c" to the dict afterward shows up in the view, so it lists all three keys.`,
    distractors: [
      `['a', 'b']`,
      `['a', 'b', 'c', 3]`,
      `['a', 'b', 3]`
    ]
  },
  {
    id: 90, tier: "core", difficulty: "medium", topic: "dicts", is_error: false,
    code: `d = dict(a=1, b=2)
print(d.pop("a"))
print(d.get("a", "gone"))`,
    output: `1
gone`,
    explanation: `pop returns the value it removes (1) and deletes that key, so afterward get() can't find "a" and falls back to "gone".`,
    distractors: [
      `1
None`,
      `1
1`,
      `a
gone`
    ]
  },
  {
    id: 91, tier: "core", difficulty: "easy", topic: "sets", is_error: false,
    code: `nums = [1, 2, 2, 3, 3, 3, 4]
print(len(set(nums)))`,
    output: `4`,
    explanation: `Turning the list into a set throws away duplicates, leaving just 1, 2, 3, 4 — four unique numbers.`,
    distractors: [
      `7`,
      `3`,
      `5`
    ]
  },
  {
    id: 92, tier: "core", difficulty: "medium", topic: "sets", is_error: false,
    code: `a = {1, 2, 3, 4}
b = {3, 4, 5, 6}
print(sorted(a & b))
print(sorted(a | b))`,
    output: `[3, 4]
[1, 2, 3, 4, 5, 6]`,
    explanation: `& keeps only what's in BOTH sets (3 and 4), while | merges everything together with no repeats.`,
    distractors: [
      `[3, 4]
[1, 2, 5, 6]`,
      `[3, 4, 5]
[1, 2, 3, 4, 5, 6]`,
      `[1, 2]
[1, 2, 3, 4, 5, 6]`
    ]
  },
  {
    id: 93, tier: "core", difficulty: "easy", topic: "sets", is_error: false,
    code: `a = {1, 2, 3, 4, 5}
b = {2, 4}
print(sorted(a - b))`,
    output: `[1, 3, 5]`,
    explanation: `a - b removes anything from a that also appears in b, so 2 and 4 drop out and 1, 3, 5 remain.`,
    distractors: [
      `[1, 2, 3, 4, 5]`,
      `[2, 4]`,
      `[3, 5]`
    ]
  },
  {
    id: 94, tier: "core", difficulty: "medium", topic: "sets", is_error: false,
    code: `word = "banana"
print(len(set(word)))`,
    output: `3`,
    explanation: `"banana" has only three different letters — b, a, n — so the set of its characters has length 3.`,
    distractors: [
      `6`,
      `2`,
      `5`
    ]
  },
  {
    id: 95, tier: "core", difficulty: "medium", topic: "sets", is_error: false,
    code: `a = {1, 2, 3}
b = {1, 2, 3, 4}
print(a.issubset(b))
print(a <= b)`,
    output: `True
True`,
    explanation: `Every element of a is also in b, so a is a subset of b. The <= operator means the exact same thing, so both print True.`,
    distractors: [
      `False
False`,
      `True
False`,
      `False
True`
    ]
  },
  {
    id: 96, tier: "core", difficulty: "medium", topic: "sets", is_error: false,
    code: `s = {10, 20, 30}
s.add(20)
s.discard(99)
print(len(s))
print(20 in s)`,
    output: `3
True`,
    explanation: `Adding 20 again does nothing (it's already there) and discarding a missing 99 is harmless, so the set still has 3 items and 20 is in it.`,
    distractors: [
      `4
True`,
      `3
False`,
      `4
False`
    ]
  },
  {
    id: 97, tier: "core", difficulty: "medium", topic: "dicts", is_error: false,
    code: `votes = {}
for c in "aabbbc":
    votes[c] = votes.get(c, 0) + 1
print(votes)`,
    output: `{'a': 2, 'b': 3, 'c': 1}`,
    explanation: `The get(c, 0) trick starts each new letter at 0 then counts up, tallying 2 a's, 3 b's, and 1 c in the order they first appeared.`,
    distractors: [
      `{'a': 2, 'b': 3, 'c': 1, 'd': 0}`,
      `{'a': 1, 'b': 1, 'c': 1}`,
      `{'a': 2, 'b': 2, 'c': 1}`
    ]
  },
  {
    id: 98, tier: "core", difficulty: "easy", topic: "comprehensions", is_error: false,
    code: `print([x*x for x in range(5)])`,
    output: `[0, 1, 4, 9, 16]`,
    explanation: `A list comprehension squares each number from 0 up to 4, building the list [0, 1, 4, 9, 16] in one line.`,
    distractors: [
      `[1, 4, 9, 16, 25]`,
      `[0, 1, 4, 9, 16, 25]`,
      `[1, 2, 3, 4, 5]`
    ]
  },
  {
    id: 99, tier: "core", difficulty: "easy", topic: "comprehensions", is_error: false,
    code: `print({x: x*x for x in range(1, 4)})`,
    output: `{1: 1, 2: 4, 3: 9}`,
    explanation: `A dict comprehension maps each number to its square, so 1, 2, 3 become keys with values 1, 4, 9.`,
    distractors: [
      `{0: 0, 1: 1, 2: 4}`,
      `{1: 1, 2: 4, 3: 9, 4: 16}`,
      `[1, 4, 9]`
    ]
  },
  {
    id: 100, tier: "core", difficulty: "easy", topic: "comprehensions", is_error: false,
    code: `print([x for x in range(10) if x % 3 == 0])`,
    output: `[0, 3, 6, 9]`,
    explanation: `The if-filter keeps only numbers divisible by 3, and 0 counts too since 0 % 3 is 0.`,
    distractors: [
      `[3, 6, 9]`,
      `[0, 3, 6, 9, 12]`,
      `[1, 4, 7]`
    ]
  },
  {
    id: 101, tier: "core", difficulty: "medium", topic: "comprehensions", is_error: false,
    code: `print(len({x % 3 for x in range(10)}))`,
    output: `3`,
    explanation: `Remainders when dividing by 3 can only be 0, 1, or 2, and a set drops duplicates, so just 3 distinct values remain.`,
    distractors: [
      `4`,
      `10`,
      `9`
    ]
  },
  {
    id: 102, tier: "core", difficulty: "tricky", topic: "comprehensions", is_error: false,
    code: `print([y for x in range(3) for y in range(x)])`,
    output: `[0, 0, 1]`,
    explanation: `The first loop runs x = 0, 1, 2 and the inner range(x) yields nothing, then [0], then [0, 1], so they join into [0, 0, 1].`,
    distractors: [
      `[0, 1, 2]`,
      `[0, 1, 0, 1, 2]`,
      `[1, 2]`
    ]
  },
  {
    id: 103, tier: "core", difficulty: "easy", topic: "comprehensions", is_error: false,
    code: `print([(i, c) for i, c in enumerate('abc')])`,
    output: `[(0, 'a'), (1, 'b'), (2, 'c')]`,
    explanation: `enumerate pairs each letter with its position starting at 0, giving tuples (0,'a'), (1,'b'), (2,'c').`,
    distractors: [
      `[(1, 'a'), (2, 'b'), (3, 'c')]`,
      `['a', 'b', 'c']`,
      `[(0, 'a'), (1, 'b'), (2, 'c'), (3, 'd')]`
    ]
  },
  {
    id: 104, tier: "core", difficulty: "medium", topic: "comprehensions", is_error: false,
    code: `words = ['hi', 'bye', 'yo']
print([w.upper() if len(w) == 2 else w for w in words])`,
    output: `['HI', 'bye', 'YO']`,
    explanation: `The if/else inside the comprehension uppercases only the two-letter words, so 'bye' stays lowercase while 'hi' and 'yo' shout.`,
    distractors: [
      `['HI', 'BYE', 'YO']`,
      `['hi', 'bye', 'yo']`,
      `['HI', 'YO']`
    ]
  },
  {
    id: 105, tier: "core", difficulty: "easy", topic: "loops", is_error: false,
    code: `for i in range(0, 10, 3):
    print(i, end=' ')`,
    output: `0 3 6 9 `,
    explanation: `range with a step of 3 jumps 0, 3, 6, 9 and stops before reaching 10, each printed with a trailing space.`,
    distractors: [
      `0 3 6 9 12 `,
      `3 6 9 `,
      `0 3 6 `
    ]
  },
  {
    id: 106, tier: "core", difficulty: "medium", topic: "loops", is_error: false,
    code: `print(list(range(10, 0, -2)))`,
    output: `[10, 8, 6, 4, 2]`,
    explanation: `A negative step counts down from 10 by 2s and stops before hitting 0, so it never includes 0.`,
    distractors: [
      `[10, 8, 6, 4, 2, 0]`,
      `[8, 6, 4, 2]`,
      `[10, 9, 8, 7, 6, 5, 4, 3, 2, 1]`
    ]
  },
  {
    id: 107, tier: "core", difficulty: "tricky", topic: "loops", is_error: false,
    code: `for i in range(3):
    if i == 5:
        break
else:
    print('done')`,
    output: `done`,
    explanation: `A loop's else runs only if the loop finishes without hitting break, and since i never equals 5, 'done' prints.`,
    distractors: [
      `done
done
done`,
      `None`
    ]
  },
  {
    id: 108, tier: "core", difficulty: "tricky", topic: "loops", is_error: false,
    code: `for n in range(2, 8):
    for d in range(2, n):
        if n % d == 0:
            break
    else:
        print(n, end=' ')`,
    output: `2 3 5 7 `,
    explanation: `The inner loop's else fires only when no divisor was found, so this prints exactly the prime numbers from 2 to 7.`,
    distractors: [
      `2 3 4 5 6 7 `,
      `3 5 7 `,
      `2 3 5 7 11 `
    ]
  },
  {
    id: 109, tier: "core", difficulty: "medium", topic: "loops", is_error: false,
    code: `it = iter([1, 2, 3])
print(next(it), next(it))
print(list(it))`,
    output: `1 2
[3]`,
    explanation: `Each next() pulls the next item and moves forward, so after taking 1 and 2 the iterator has only 3 left.`,
    distractors: [
      `1 2
[1, 2, 3]`,
      `1 2
[2, 3]`,
      `2 3
[1]`
    ]
  },
  {
    id: 110, tier: "core", difficulty: "tricky", topic: "loops", is_error: false,
    code: `g = (x*2 for x in range(3))
print(sum(g), sum(g))`,
    output: `6 0`,
    explanation: `A generator can only be walked once, so the first sum eats it all (0+2+4=6) and the second finds nothing left, giving 0.`,
    distractors: [
      `6 6`,
      `0 6`,
      `12 0`
    ]
  },
  {
    id: 111, tier: "core", difficulty: "easy", topic: "loops", is_error: false,
    code: `for c in reversed('cat'):
    print(c, end='')`,
    output: `tac`,
    explanation: `reversed walks the string back to front, printing the letters t, a, c with no spaces between them.`,
    distractors: [
      `cat`,
      `tca`,
      `act`
    ]
  },
  {
    id: 112, tier: "core", difficulty: "medium", topic: "comprehensions", is_error: false,
    code: `m = [[1, 2], [3, 4]]
print([v for row in m for v in row])`,
    output: `[1, 2, 3, 4]`,
    explanation: `The nested comprehension reads left to right: take each row, then each value in it, flattening the grid into one list.`,
    distractors: [
      `[[1, 2], [3, 4]]`,
      `[1, 3, 2, 4]`,
      `[1, 2, 3, 4, 5]`
    ]
  },
  {
    id: 113, tier: "core", difficulty: "easy", topic: "functions", is_error: false,
    code: `def greet(name):
    print("hi", name)

result = greet("Sam")
print(result)`,
    output: `hi Sam
None`,
    explanation: `greet prints but never says 'return', so it hands back None automatically. That None is what gets stored in result and printed on the second line.`,
    distractors: [
      `hi Sam`,
      `None
hi Sam`,
      `hi Sam
hi Sam`
    ]
  },
  {
    id: 114, tier: "core", difficulty: "easy", topic: "functions", is_error: false,
    code: `def add(*args):
    return sum(args)

print(add(1, 2, 3, 4))`,
    output: `10`,
    explanation: `The *args scoops up all four numbers into one tuple, and sum adds them up to 10.`,
    distractors: [
      `24`,
      `4`,
      `[1, 2, 3, 4]`
    ]
  },
  {
    id: 115, tier: "core", difficulty: "easy", topic: "functions", is_error: false,
    code: `def info(**kwargs):
    return len(kwargs)

print(info(a=1, b=2, c=3))`,
    output: `3`,
    explanation: `The **kwargs gathers all three named arguments into a dictionary, and that dict has 3 keys.`,
    distractors: [
      `6`,
      `{'a': 1, 'b': 2, 'c': 3}`,
      `0`
    ]
  },
  {
    id: 116, tier: "core", difficulty: "easy", topic: "functions", is_error: false,
    code: `def power(base, exp=2):
    return base ** exp

print(power(3), power(2, 3))`,
    output: `9 8`,
    explanation: `The first call leaves exp at its default 2, so 3 squared is 9. The second call passes 3, so it's 2 cubed, which is 8.`,
    distractors: [
      `6 8`,
      `9 6`,
      `3 8`
    ]
  },
  {
    id: 117, tier: "core", difficulty: "medium", topic: "functions", is_error: false,
    code: `n = 5
def make():
    return n * 2
n = 10
print(make())`,
    output: `20`,
    explanation: `The function looks up n only when it actually runs, not when it's defined. By call time n is already 10, so you get 20.`,
    distractors: [
      `10`,
      `NameError`,
      `5`
    ]
  },
  {
    id: 118, tier: "core", difficulty: "tricky", topic: "functions", is_error: false,
    code: `def outer():
    x = 1
    def inner():
        nonlocal x
        x += 5
    inner()
    return x

print(outer())`,
    output: `6`,
    explanation: `The 'nonlocal x' lets inner reach out and change outer's own x instead of making a new local one, so 1 becomes 6.`,
    distractors: [
      `1`,
      `5`,
      `11`
    ]
  },
  {
    id: 119, tier: "core", difficulty: "medium", topic: "functions", is_error: false,
    code: `count = 0
def bump():
    global count
    count += 1
bump()
bump()
print(count)`,
    output: `2`,
    explanation: `'global count' means bump edits the real top-level count, so calling it twice pushes it from 0 up to 2.`,
    distractors: [
      `0`,
      `1`,
      `None`
    ]
  },
  {
    id: 120, tier: "core", difficulty: "tricky", topic: "functions", is_error: false,
    code: `i = 1
def step(x=i):
    return x
i = 99
print(step())`,
    output: `1`,
    explanation: `Default values are frozen once, right when the function is defined. At that moment i was 1, so changing i to 99 later doesn't matter.`,
    distractors: [
      `99`,
      `NameError`,
      `None`
    ]
  },
  {
    id: 121, tier: "core", difficulty: "medium", topic: "functions", is_error: false,
    code: `double = lambda x: x * 2
funcs = [lambda: double(3), lambda: double(4)]
print(funcs[0]() + funcs[1]())`,
    output: `14`,
    explanation: `double just multiplies by 2, so the two little lambdas give 6 and 8, and 6 plus 8 is 14.`,
    distractors: [
      `6`,
      `7`,
      `24`
    ]
  },
  {
    id: 122, tier: "core", difficulty: "tricky", topic: "functions", is_error: false,
    code: `def make_adder(n):
    def adder(x):
        return x + n
    return adder

add10 = make_adder(10)
print(add10(5))`,
    output: `15`,
    explanation: `make_adder hands back a function that remembers n was 10 (that's a closure), so add10(5) adds 5 + 10 to get 15.`,
    distractors: [
      `10`,
      `5`,
      `50`
    ]
  },
  {
    id: 123, tier: "core", difficulty: "easy", topic: "functions", is_error: false,
    code: `def describe(a, b, c):
    return f"{a}-{b}-{c}"

print(describe(c=3, a=1, b=2))`,
    output: `1-2-3`,
    explanation: `Naming the arguments lets you pass them in any order; each value still lands in its own slot, so it reads 1-2-3.`,
    distractors: [
      `3-1-2`,
      `3-2-1`,
      `1 2 3`
    ]
  },
  {
    id: 124, tier: "core", difficulty: "medium", topic: "functions", is_error: false,
    code: `def f(a, b=10, *args):
    return a + b + sum(args)

print(f(1))
print(f(1, 2, 3, 4))`,
    output: `11
10`,
    explanation: `First call: a is 1, b stays at its default 10, no extras, so 11. Second call: a is 1, b becomes 2, and *args grabs 3 and 4, so 1+2+3+4 is 10.`,
    distractors: [
      `11
11`,
      `13
10`,
      `1
10`
    ]
  },
  {
    id: 125, tier: "core", difficulty: "medium", topic: "functions", is_error: false,
    code: `x = 10
def show():
    x = 20
show()
print(x)`,
    output: `10`,
    explanation: `Assigning x inside show makes a brand-new local x that vanishes when the function ends, so the outer x is still 10.`,
    distractors: [
      `20`,
      `None`,
      `NameError`
    ]
  },
  {
    id: 126, tier: "core", difficulty: "tricky", topic: "classes", is_error: false,
    code: `class P:
    def __repr__(self):
        return "R"
    def __str__(self):
        return "S"
p = P()
print(p)
print([p])`,
    output: `S
[R]`,
    explanation: `print() shows an object using its __str__, so you get S. But putting it inside a list uses __repr__ for each element, so the list prints [R].`,
    distractors: [
      `R
[S]`,
      `S
[S]`,
      `R
[R]`
    ]
  },
  {
    id: 127, tier: "core", difficulty: "medium", topic: "classes", is_error: false,
    code: `class C:
    x = 10
a = C()
b = C()
a.x = 99
print(a.x, b.x, C.x)`,
    output: `99 10 10`,
    explanation: `Assigning a.x = 99 creates a personal attribute on a only. b and the class itself still see the original class value 10.`,
    distractors: [
      `99 99 99`,
      `99 10 99`,
      `10 10 10`
    ]
  },
  {
    id: 128, tier: "core", difficulty: "medium", topic: "classes", is_error: false,
    code: `class A:
    def hi(self):
        return "A"
class B(A):
    def hi(self):
        return super().hi() + "B"
print(B().hi())`,
    output: `AB`,
    explanation: `B's hi() first calls the parent's hi() via super(), which returns "A", then tacks on "B", giving "AB".`,
    distractors: [
      `BA`,
      `A`,
      `B`
    ]
  },
  {
    id: 129, tier: "core", difficulty: "tricky", topic: "classes", is_error: false,
    code: `print(isinstance(True, int))
print(issubclass(bool, int))
print(True + True)`,
    output: `True
True
2`,
    explanation: `In Python bool is actually a subclass of int, so True is an int too, and True + True quietly adds up to 2.`,
    distractors: [
      `True
True
1`,
      `False
False
2`,
      `True
False
2`
    ]
  },
  {
    id: 130, tier: "library", difficulty: "tricky", topic: "mutability", is_error: false,
    code: `import copy
a = [[1, 2], [3, 4]]
b = copy.copy(a)
b[0].append(99)
print(a)`,
    output: `[[1, 2, 99], [3, 4]]`,
    explanation: `A shallow copy makes a new outer list but the inner lists are still shared, so appending to b's first row also changes a's first row.`,
    distractors: [
      `[[1, 2], [3, 4]]`,
      `[[1, 2, 99], [3, 4, 99]]`,
      `[1, 2, 99]`
    ]
  },
  {
    id: 131, tier: "library", difficulty: "medium", topic: "mutability", is_error: false,
    code: `import copy
a = [[1, 2], [3, 4]]
b = copy.deepcopy(a)
b[0].append(99)
print(a)
print(b)`,
    output: `[[1, 2], [3, 4]]
[[1, 2, 99], [3, 4]]`,
    explanation: `deepcopy clones the inner lists too, so b is fully independent: changing b leaves a untouched.`,
    distractors: [
      `[[1, 2, 99], [3, 4]]
[[1, 2, 99], [3, 4]]`,
      `[[1, 2], [3, 4]]
[[1, 2], [3, 4]]`,
      `[[1, 2, 99], [3, 4]]
[[1, 2], [3, 4]]`
    ]
  },
  {
    id: 132, tier: "core", difficulty: "medium", topic: "classes", is_error: false,
    code: `class Animal:
    def speak(self):
        return self.sound()
    def sound(self):
        return "..."
class Cat(Animal):
    def sound(self):
        return "meow"
print(Cat().speak())`,
    output: `meow`,
    explanation: `speak() calls self.sound(), and since self is a Cat, Python uses Cat's sound() instead of Animal's, giving meow.`,
    distractors: [
      `...`,
      `Animal`,
      `meowmeow`
    ]
  },
  {
    id: 133, tier: "core", difficulty: "tricky", topic: "classes", is_error: false,
    code: `class V:
    def __init__(self, n):
        self.n = n
    def __eq__(self, other):
        return self.n == other.n
print(V(5) == V(5))
print(V(5) in [V(1), V(5), V(9)])`,
    output: `True
True`,
    explanation: `Defining __eq__ tells Python how two V objects compare, so equal n means equal objects, and 'in' uses that same rule to find the match.`,
    distractors: [
      `True
False`,
      `False
False`,
      `False
True`
    ]
  },
  {
    id: 134, tier: "core", difficulty: "tricky", topic: "classes", is_error: false,
    code: `class Counter:
    count = 0
    def __init__(self):
        Counter.count += 1
Counter()
Counter()
Counter()
print(Counter.count)
print(Counter().count)`,
    output: `3
4`,
    explanation: `Each new Counter bumps the shared class count, so after three it's 3. Making a fourth one inside the print bumps it to 4 first, and that instance reads the class value 4.`,
    distractors: [
      `3
3`,
      `4
4`,
      `3
0`
    ]
  },
  {
    id: 135, tier: "core", difficulty: "medium", topic: "classes", is_error: false,
    code: `class A:
    def who(self):
        return type(self).__name__
class B(A):
    pass
print(A().who())
print(B().who())`,
    output: `A
B`,
    explanation: `who() asks for the real type of self, so even though B inherits the method, a B object reports its own name B, not A.`,
    distractors: [
      `A
A`,
      `B
B`,
      `A
None`
    ]
  },
  {
    id: 136, tier: "core", difficulty: "medium", topic: "mutability", is_error: false,
    code: `class T:
    def __init__(self):
        self.data = [1, 2, 3]
a = T()
b = a
b.data.append(4)
print(a.data)
print(a is b)`,
    output: `[1, 2, 3, 4]
True`,
    explanation: `b = a doesn't copy the object, it just gives the same object a second name, so editing b.data edits a.data, and a is b is True.`,
    distractors: [
      `[1, 2, 3]
True`,
      `[1, 2, 3, 4]
False`,
      `[1, 2, 3]
False`
    ]
  },
  {
    id: 137, tier: "core", difficulty: "medium", topic: "classes", is_error: false,
    code: `class Base:
    greeting = "hello"
class Sub(Base):
    pass
Sub.greeting = "hi"
print(Base.greeting)
print(Sub.greeting)`,
    output: `hello
hi`,
    explanation: `Assigning Sub.greeting creates a new attribute on Sub itself and doesn't reach back into Base, so Base still says hello while Sub says hi.`,
    distractors: [
      `hi
hi`,
      `hello
hello`,
      `hi
hello`
    ]
  },
  {
    id: 138, tier: "core", difficulty: "easy", topic: "exceptions", is_error: true,
    code: `print("age: " + 25)`,
    output: `TypeError`,
    explanation: `Python won't glue a string and a number together with +. It refuses to guess whether you meant text or math, so it raises a TypeError.`,
    distractors: [
      `ValueError`,
      `SyntaxError`,
      `ConcatenationError`
    ]
  },
  {
    id: 139, tier: "core", difficulty: "medium", topic: "exceptions", is_error: true,
    code: `print(int("12.5"))`,
    output: `ValueError`,
    explanation: `int() can read a string of whole-number digits, but "12.5" has a dot in it, so it can't be turned into an int and Python raises a ValueError.`,
    distractors: [
      `TypeError`,
      `SyntaxError`,
      `FloatingPointError`
    ]
  },
  {
    id: 140, tier: "core", difficulty: "easy", topic: "exceptions", is_error: true,
    code: `d = {"a": 1, "b": 2}
print(d["c"])`,
    output: `KeyError`,
    explanation: `There's no "c" key in the dictionary, so asking for d["c"] makes Python raise a KeyError.`,
    distractors: [
      `IndexError`,
      `ValueError`,
      `NameError`
    ]
  },
  {
    id: 141, tier: "core", difficulty: "easy", topic: "exceptions", is_error: true,
    code: `print(10 / 0)`,
    output: `ZeroDivisionError`,
    explanation: `Dividing by zero has no answer in math, so Python stops and raises a ZeroDivisionError.`,
    distractors: [
      `ArithmeticError`,
      `ValueError`,
      `OverflowError`
    ]
  },
  {
    id: 142, tier: "core", difficulty: "medium", topic: "exceptions", is_error: true,
    code: `x = 5
print(x.upper())`,
    output: `AttributeError`,
    explanation: `.upper() is a string trick, but x is an int, and ints don't have an upper() method, so Python raises an AttributeError.`,
    distractors: [
      `TypeError`,
      `ValueError`,
      `NameError`
    ]
  },
  {
    id: 143, tier: "core", difficulty: "easy", topic: "exceptions", is_error: true,
    code: `nums = [1, 2, 3]
print(nums[5])`,
    output: `IndexError`,
    explanation: `The list only has positions 0, 1, and 2, so reaching for index 5 goes off the end and raises an IndexError.`,
    distractors: [
      `KeyError`,
      `ValueError`,
      `OutOfRangeError`
    ]
  },
  {
    id: 144, tier: "core", difficulty: "medium", topic: "exceptions", is_error: true,
    code: `t = (1, 2, 3)
t[0] = 99
print(t)`,
    output: `TypeError`,
    explanation: `Tuples are frozen once made, so you can't change t[0]. Trying to reassign an item raises a TypeError.`,
    distractors: [
      `IndexError`,
      `ValueError`,
      `AttributeError`
    ]
  },
  {
    id: 145, tier: "core", difficulty: "easy", topic: "numbers", is_error: false,
    code: `print(int("3") + 4)`,
    output: `7`,
    explanation: `int("3") turns the text "3" into the number 3, and then 3 + 4 is plain math, so you get 7.`,
    distractors: [
      `34`,
      `'34'`,
      `7.0`
    ]
  },
  {
    id: 146, tier: "core", difficulty: "easy", topic: "strings", is_error: false,
    code: `print("5" * 3)`,
    output: `555`,
    explanation: `Multiplying a string by a number repeats it, so "5" times 3 stacks three 5s into the text "555" instead of doing math.`,
    distractors: [
      `15`,
      `'555'`
    ]
  },
  {
    id: 147, tier: "core", difficulty: "tricky", topic: "strings", is_error: false,
    code: `print("3" + str(4) * 2)`,
    output: `344`,
    explanation: `Python does * before +, so str(4)*2 becomes "44" first, then "3" + "44" joins into "344" as text.`,
    distractors: [
      `342`,
      `'344'`,
      `38`
    ]
  },
  {
    id: 148, tier: "core", difficulty: "medium", topic: "numbers", is_error: false,
    code: `print(int("7") + float("2.5"))`,
    output: `9.5`,
    explanation: `int("7") is 7 and float("2.5") is 2.5; adding an int to a float gives a float, so the answer prints as 9.5.`,
    distractors: [
      `9`,
      `9.50`,
      `72.5`
    ]
  },
  {
    id: 149, tier: "core", difficulty: "tricky", topic: "logic", is_error: false,
    code: `print(bool("0") + True)`,
    output: `2`,
    explanation: `Any non-empty string is truthy, even "0", so bool("0") is True, and True + True adds up like 1 + 1 to give 2.`,
    distractors: [
      `1`,
      `True`,
      `0`
    ]
  },
  {
    id: 150, tier: "library", difficulty: "tricky", topic: "collections", is_error: false,
    code: `from collections import Counter
a = Counter('banana')
b = Counter('bandana')
print(a - b)`,
    output: `Counter()`,
    explanation: `Counter subtraction throws away any count that hits zero or goes negative, and since 'bandana' has every letter of 'banana' (plus a 'd'), nothing is left over, so you get an empty Counter().`,
    distractors: [
      `Counter({'d': 1})`,
      `Counter({'d': -1})`,
      `Counter({'b': 0, 'a': 0, 'n': 0})`
    ]
  },
  {
    id: 151, tier: "library", difficulty: "medium", topic: "collections", is_error: false,
    code: `from collections import Counter
c = Counter(a=3, b=1, c=0, d=-1)
print(list(c.elements()))`,
    output: `['a', 'a', 'a', 'b']`,
    explanation: `elements() repeats each key as many times as its count, but it skips anything with a zero or negative count, so 'c' and 'd' vanish entirely.`,
    distractors: [
      `['a', 'a', 'a', 'b', 'c']`,
      `['a', 'a', 'a', 'b', 'c', 'd']`,
      `['a', 'b', 'c', 'd']`
    ]
  },
  {
    id: 152, tier: "library", difficulty: "medium", topic: "collections", is_error: false,
    code: `from collections import defaultdict
d = defaultdict(int)
for ch in 'mississippi':
    d[ch] += 1
print(d['x'], dict(d))`,
    output: `0 {'m': 1, 'i': 4, 's': 4, 'p': 2, 'x': 0}`,
    explanation: `A defaultdict(int) hands you a 0 for any missing key, so counting works without setup, and just asking for d['x'] quietly creates an 'x':0 entry.`,
    distractors: [
      `0 {'m': 1, 'i': 4, 's': 4, 'p': 2}`,
      `None {'m': 1, 'i': 4, 's': 4, 'p': 2}`,
      `0 {'m': 1, 'i': 4, 's': 4, 'p': 2, 'x': None}`
    ]
  },
  {
    id: 153, tier: "library", difficulty: "medium", topic: "collections", is_error: false,
    code: `from collections import deque
dq = deque([1, 2, 3, 4, 5])
dq.rotate(2)
print(list(dq))`,
    output: `[4, 5, 1, 2, 3]`,
    explanation: `rotate(2) shifts everything to the right by 2 spots, so the last two items wrap around to the front.`,
    distractors: [
      `[3, 4, 5, 1, 2]`,
      `[1, 2, 3, 4, 5]`,
      `[2, 3, 4, 5, 1]`
    ]
  },
  {
    id: 154, tier: "library", difficulty: "medium", topic: "collections", is_error: false,
    code: `from collections import namedtuple
Point = namedtuple('Point', 'x y')
p = Point(1, 2)
q = p._replace(y=9)
print(p, q)`,
    output: `Point(x=1, y=2) Point(x=1, y=9)`,
    explanation: `Namedtuples are immutable, so _replace doesn't modify p — it returns a brand-new Point with only the specified field swapped, leaving the original p completely untouched.`,
    distractors: [
      `Point(x=1, y=9) Point(x=1, y=9)`,
      `Point(x=1, y=2) Point(x=9, y=2)`,
      `(1, 2) (1, 9)`
    ]
  },
  {
    id: 155, tier: "library", difficulty: "easy", topic: "collections", is_error: false,
    code: `from collections import Counter
print(Counter('aabbbc').most_common(2))`,
    output: `[('b', 3), ('a', 2)]`,
    explanation: `most_common(2) returns the two highest-count letters as (letter, count) pairs, ranked from most frequent down.`,
    distractors: [
      `[('a', 2), ('b', 3)]`,
      `[('b', 3), ('a', 2), ('c', 1)]`,
      `{'b': 3, 'a': 2}`
    ]
  },
  {
    id: 156, tier: "library", difficulty: "medium", topic: "itertools", is_error: false,
    code: `from itertools import accumulate
print(list(accumulate([1, 2, 3, 4, 5])))`,
    output: `[1, 3, 6, 10, 15]`,
    explanation: `accumulate builds a running total: it keeps a growing sum as it steps through the list, so each output value is the sum of everything up to and including that position.`,
    distractors: [
      `[1, 2, 3, 4, 5]`,
      `[1, 3, 6, 10]`,
      `[0, 1, 3, 6, 10, 15]`
    ]
  },
  {
    id: 157, tier: "library", difficulty: "medium", topic: "itertools", is_error: false,
    code: `from itertools import chain
print(list(chain('AB', [1, 2], 'C')))`,
    output: `['A', 'B', 1, 2, 'C']`,
    explanation: `chain glues iterables end to end, and since a string is iterable it gets split into its individual characters too.`,
    distractors: [
      `['AB', 1, 2, 'C']`,
      `['A', 'B', [1, 2], 'C']`,
      `['AB', [1, 2], 'C']`
    ]
  },
  {
    id: 158, tier: "library", difficulty: "medium", topic: "itertools", is_error: false,
    code: `from itertools import product
print(list(product([0, 1], repeat=2)))`,
    output: `[(0, 0), (0, 1), (1, 0), (1, 1)]`,
    explanation: `product with repeat=2 makes every ordered pair from the list, which is exactly counting in binary from 00 up to 11.`,
    distractors: [
      `[(0, 1), (1, 0)]`,
      `[(0, 0), (1, 1)]`,
      `[(0, 0), (1, 0), (0, 1), (1, 1)]`
    ]
  },
  {
    id: 159, tier: "library", difficulty: "tricky", topic: "itertools", is_error: false,
    code: `from itertools import islice, count
print(list(islice(count(10, 2), 4)))`,
    output: `[10, 12, 14, 16]`,
    explanation: `count(10, 2) is an endless 10, 12, 14, ... and islice just takes the first 4 of it, so an infinite counter is safely stopped.`,
    distractors: [
      `[10, 12, 14, 16, 18]`,
      `[12, 14, 16, 18]`,
      `[10, 11, 12, 13]`
    ]
  },
  {
    id: 160, tier: "library", difficulty: "tricky", topic: "itertools", is_error: false,
    code: `from itertools import groupby
data = sorted('mississippi')
print([(k, len(list(g))) for k, g in groupby(data)])`,
    output: `[('i', 4), ('m', 1), ('p', 2), ('s', 4)]`,
    explanation: `groupby only merges neighbors that are equal, so sorting first lines up identical letters; the result lists each letter alphabetically with its run length.`,
    distractors: [
      `[('m', 1), ('i', 4), ('s', 4), ('p', 2)]`,
      `[('i', 1), ('m', 1), ('p', 1), ('s', 1)]`,
      `[('i', 4), ('s', 4), ('p', 2), ('m', 1)]`
    ]
  },
  {
    id: 161, tier: "library", difficulty: "medium", topic: "functools", is_error: false,
    code: `from functools import reduce
print(reduce(lambda a, b: a + b, [10, 20, 30], 5))`,
    output: `65`,
    explanation: `reduce folds the list into one value, and the extra 5 is the starting point, so it's 5+10+20+30.`,
    distractors: [
      `60`,
      `65.0`,
      `[10, 30, 60]`
    ]
  },
  {
    id: 162, tier: "library", difficulty: "tricky", topic: "functools", is_error: false,
    code: `from functools import partial
base3 = partial(int, base=3)
print(base3('100'))`,
    output: `9`,
    explanation: `partial locks int's base to 3, so base3('100') reads '100' as a base-3 number, which is 9 in normal counting.`,
    distractors: [
      `100`,
      `3`,
      `27`
    ]
  },
  {
    id: 163, tier: "library", difficulty: "medium", topic: "math", is_error: false,
    code: `import math
print(math.floor(-2.5), math.ceil(-2.5))`,
    output: `-3 -2`,
    explanation: `floor always rounds DOWN toward negative infinity, so -2.5 becomes -3, while ceil rounds UP, so -2.5 becomes -2. With negatives they go opposite ways from what you might guess.`,
    distractors: [
      `-2 -3`,
      `-2 -2`,
      `-3 -3`
    ]
  },
  {
    id: 164, tier: "library", difficulty: "easy", topic: "math", is_error: false,
    code: `import math
print(math.factorial(5) // math.factorial(3))`,
    output: `20`,
    explanation: `5! is 120 and 3! is 6, and 120 divided by 6 is exactly 20.`,
    distractors: [
      `120`,
      `40`,
      `6`
    ]
  },
  {
    id: 165, tier: "library", difficulty: "medium", topic: "math", is_error: false,
    code: `import math
print(pow(2, 10, 1000))`,
    output: `24`,
    explanation: `Python's built-in pow() (not math.pow) accepts a third argument as a modulus: it computes 2 to the 10th (1024) then takes the remainder divided by 1000, which leaves 24. The 'import math' line is not used here.`,
    distractors: [
      `1024`,
      `48`,
      `2`
    ]
  },
  {
    id: 166, tier: "library", difficulty: "medium", topic: "math", is_error: false,
    code: `import math
print(math.comb(5, 2), math.perm(5, 2))`,
    output: `10 20`,
    explanation: `comb counts how many ways to CHOOSE 2 from 5 ignoring order (10), while perm counts ordered arrangements (20), so order doubles the count here.`,
    distractors: [
      `20 10`,
      `10 10`,
      `20 20`
    ]
  },
  {
    id: 167, tier: "library", difficulty: "easy", topic: "random", is_error: false,
    code: `import random
random.seed(0)
print(random.choice([10, 20, 30, 40]))`,
    output: `40`,
    explanation: `Seeding with 0 makes random pick the very same item every run, and from this list that lands on 40.`,
    distractors: [
      `10`,
      `20`,
      `30`
    ]
  },
  {
    id: 168, tier: "library", difficulty: "tricky", topic: "random", is_error: false,
    code: `import random
random.seed(1)
print(random.sample(range(1, 6), 3))`,
    output: `[2, 1, 5]`,
    explanation: `sample grabs 3 different numbers from 1..5 with no repeats, and the seed fixes both which ones and their shuffled order, so you get exactly [2, 1, 5].`,
    distractors: [
      `[1, 2, 5]`,
      `[3, 1, 4]`,
      `[5, 2, 1]`
    ]
  },
  {
    id: 169, tier: "library", difficulty: "medium", topic: "random", is_error: false,
    code: `import random
random.seed(5)
print(random.randrange(0, 100, 10))`,
    output: `90`,
    explanation: `randrange with step 10 only picks from 0, 10, 20, ... 90, and with this seed it lands on 90.`,
    distractors: [
      `50`,
      `9`,
      `91`
    ]
  },
  {
    id: 170, tier: "library", difficulty: "medium", topic: "datetime", is_error: false,
    code: `import datetime
d = datetime.date(2026, 1, 1)
print((d + datetime.timedelta(days=100)).strftime('%Y-%m-%d'))`,
    output: `2026-04-11`,
    explanation: `Adding 100 days to January 1st walks through the calendar (Jan has 31, Feb 2026 has 28, Mar has 31) and lands on April 11th.`,
    distractors: [
      `2026-04-10`,
      `2026-04-12`,
      `2026-03-11`
    ]
  },
  {
    id: 171, tier: "library", difficulty: "easy", topic: "datetime", is_error: false,
    code: `import datetime
print(datetime.date(2026, 6, 30).weekday())`,
    output: `1`,
    explanation: `weekday() numbers days starting at Monday = 0, and June 30, 2026 is a Tuesday, so it prints 1.`,
    distractors: [
      `2`,
      `0`,
      `6`
    ]
  },
  {
    id: 172, tier: "library", difficulty: "tricky", topic: "json", is_error: false,
    code: `import json
d = json.loads('{"b": 1, "a": 2}')
print(json.dumps(d, sort_keys=True, separators=(',', ':')))`,
    output: `{"a":2,"b":1}`,
    explanation: `sort_keys reorders the keys alphabetically so a comes before b, and the tight separators remove every space, giving a compact string.`,
    distractors: [
      `{"b":1,"a":2}`
    ]
  },
  {
    id: 173, tier: "library", difficulty: "tricky", topic: "statistics", is_error: false,
    code: `import statistics
print(statistics.median([7, 1, 3, 9]))`,
    output: `5.0`,
    explanation: `median first sorts to 1, 3, 7, 9, then averages the two middle numbers (3 and 7), and an average is a float, so it prints 5.0 not 5.`,
    distractors: [
      `4.0`,
      `6.0`,
      `3.0`
    ]
  },
  {
    id: 174, tier: "library", difficulty: "easy", topic: "statistics", is_error: false,
    code: `import statistics
print(statistics.mode([4, 4, 2, 2, 4, 1]))`,
    output: `4`,
    explanation: `mode returns the most frequent value, and 4 shows up three times, more than any other number.`,
    distractors: [
      `2`,
      `3`,
      `[4]`
    ]
  },
  {
    id: 175, tier: "library", difficulty: "tricky", topic: "numpy", is_error: false,
    code: `import numpy as np
print(np.arange(1, 7).reshape(2, 3).sum(axis=0))`,
    output: `[5 7 9]`,
    explanation: `The grid is [[1,2,3],[4,5,6]], and sum(axis=0) collapses the rows by adding down each COLUMN, giving 1+4, 2+5, 3+6.`,
    distractors: []
  }
];

function _norm(filter) {
  if (typeof filter === 'string') return { tier: filter, difficulty: 'all', topic: 'all' };
  filter = filter || {};
  return {
    tier: filter.tier || filter.content || 'all',
    difficulty: filter.difficulty || 'all',
    topic: filter.topic || 'all'
  };
}

/** Snippets matching a filter ({tier|content, difficulty, topic}); legacy string = tier. */
function getSnippets(filter) {
  const f = _norm(filter);
  return SNIPPETS.filter((s) =>
    (f.tier === 'all' || s.tier === f.tier) &&
    (f.difficulty === 'all' || s.difficulty === f.difficulty) &&
    (f.topic === 'all' || s.topic === f.topic)
  );
}

/** Bank metadata for the host filter UI (no answers leaked — tags only). */
function getMeta() {
  const topicCounts = {};
  for (const s of SNIPPETS) topicCounts[s.topic] = (topicCounts[s.topic] || 0) + 1;
  const topics = Object.keys(topicCounts).sort().map((t) => ({ topic: t, count: topicCounts[t] }));
  return {
    total: SNIPPETS.length,
    topics,
    tiers: ['core', 'library'],
    difficulties: ['easy', 'medium', 'tricky'],
    tags: SNIPPETS.map((s) => ({ tier: s.tier, difficulty: s.difficulty, topic: s.topic }))
  };
}

module.exports = { SNIPPETS, getSnippets, getMeta };
