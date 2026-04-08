function sum_to_n_a(n: number): number {
  // Basic/brute-force approach.
  // Time: O(n), Space: O(n)
  if (!Number.isInteger(n)) {
    throw new Error('n must be an integer');
  }

  if (n === 0) {
    return 0;
  }

  const step = n > 0 ? 1 : -1;
  const numbers = Array.from({ length: Math.abs(n) }, (_value, index) => {
    return step * (index + 1);
  });
  return numbers.reduce((acc, value) => acc + value, 0);
}

function sum_to_n_b(n: number): number {
  // Looping approach.
  // Time: O(n), Space: O(1)
  if (!Number.isInteger(n)) {
    throw new Error('n must be an integer');
  }

  if (n === 0) {
    return 0;
  }

  let sum = 0;

  if (n > 0) {
    for (let i = 1; i <= n; i += 1) {
      sum += i;
    }
  } else {
    for (let i = -1; i >= n; i -= 1) {
      sum += i;
    }
  }

  return sum;
}

function sum_to_n_c(n: number): number {
  // Most efficient with a formula.
  // Time: O(1), Space: O(1)
  if (!Number.isInteger(n)) {
    throw new Error('n must be an integer');
  }

  if (n === 0) {
    return 0;
  }

  if (n > 0) {
    return (n * (n + 1)) / 2;
  }

  const num = Math.abs(n);
  return -((num * (num + 1)) / 2);
}

export { sum_to_n_a, sum_to_n_b, sum_to_n_c };
