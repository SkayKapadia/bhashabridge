The function returns `Promise { <pending> }` because `getUser` is asynchronous and you did not wait for it. An async function always returns a promise, even when the value is ready quickly.

Add `await` and make the calling function async too:

```ts
async function showProfile(id: string) {
  const user = await getUser(id);
  console.log(user.name);
}
```

If you call `getUser` inside a loop, use `Promise.all` so the requests run in parallel instead of one after another. Also wrap the call in `try/catch`, because a rejected promise will otherwise become an unhandled rejection.
