The pod is in `CrashLoopBackOff` because the container starts, exits with an error, and Kubernetes keeps restarting it with a growing delay. The cause is inside the container, not in Kubernetes itself.

Read the logs of the last failed run:

```bash
kubectl logs my-api-7d9f8 --previous
```

In most cases the application cannot connect to the database because an environment variable such as `DATABASE_URL` is missing from the deployment. Check the `env` section of the manifest and the referenced secret.
