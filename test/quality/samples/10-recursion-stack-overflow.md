You get `RangeError: Maximum call stack size exceeded` because the recursive function never reaches its base case. When `n` is negative, `factorial(n - 1)` keeps calling itself forever.

Add a guard for invalid input:

```js
function factorial(n) {
  if (n < 0) throw new Error("n must not be negative");
  if (n === 0) return 1;
  return n * factorial(n - 1);
}
```

For very large inputs, an iterative loop is safer than recursion, because each recursive call uses a new stack frame.
