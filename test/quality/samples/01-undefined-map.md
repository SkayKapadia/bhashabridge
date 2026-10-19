## Why your code crashes

The error `TypeError: Cannot read properties of undefined (reading 'map')` happens because `users` is undefined when the component first renders. The API call in `useEffect` has not finished yet, so the array does not exist.

To fix it, give `users` a default value and check it before calling `map`:

```js
const [users, setUsers] = useState([]);

useEffect(() => {
  fetchUsers().then(setUsers);
}, []);
```

A quick alternative is optional chaining:
const names = users?.map(getName);

Remember these points:

- Always initialise state with the right type, such as an empty array.
- Use a loading flag if you want to show a spinner while the data arrives.
- Keep the dependency array empty so the request runs only once.
