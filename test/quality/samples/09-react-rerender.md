The component renders in an infinite loop because `setCount` is called directly in the component body. Every state update causes a re-render, and every render calls `setCount` again.

Move the update into an event handler or into `useEffect` with the right dependency array:

```jsx
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>;
}
```

As a rule, never update state while rendering. Rendering should only describe the UI for the current props and state.
