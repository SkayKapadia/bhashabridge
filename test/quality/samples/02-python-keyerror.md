Your script fails with `KeyError: 'email'` because one of the dictionaries in `rows` has no `email` key. Python raises this error whenever you read a key that does not exist with square brackets.

Use `dict.get()` with a default value instead:

```python
for row in rows:
    email = row.get("email", "")
    if not email:
        print(f"Skipping row {row.get('id')}: no email")
        continue
    send_welcome(email)
```

This way the loop keeps running and you can see which rows are incomplete. If every row must have an email, it is better to validate the data when you load it and fail early with a clear message.
