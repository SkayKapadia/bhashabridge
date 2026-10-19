TypeScript reports `Type 'string | undefined' is not assignable to type 'string'` because `process.env.API_KEY` might not be set. Environment variables are always optional from the compiler's point of view.

Check the value once at startup and fail with a clear message:

```ts
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error("API_KEY is not set");
}
```

After this check, TypeScript knows `apiKey` is a `string`. Avoid the non-null assertion `process.env.API_KEY!`, because it hides the problem until the code crashes at runtime.
