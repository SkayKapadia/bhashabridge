The image build is slow because Docker copies your whole project before installing dependencies. Every small code change invalidates the cache, so `npm install` runs again each time.

Copy the package files first, install, and only then copy the rest:

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
CMD ["node", "server.js"]
```

Also add a `.dockerignore` file with `node_modules` and `.git`, so they are never sent to the Docker daemon. With these two changes, rebuilding after a code change usually takes a few seconds.
