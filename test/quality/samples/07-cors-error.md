The browser blocks the request because the API server does not send the `Access-Control-Allow-Origin` header. This is a CORS rule: a page on `http://localhost:3000` may not read responses from `http://localhost:8080` unless the server allows it.

The fix belongs on the server, not in the frontend. In an Express backend you can use the `cors` middleware:

```js
import cors from "cors";

app.use(cors({ origin: "http://localhost:3000" }));
```

Do not use `origin: "*"` in production if your API uses cookies or authentication, because the browser will refuse credentials with a wildcard origin.
