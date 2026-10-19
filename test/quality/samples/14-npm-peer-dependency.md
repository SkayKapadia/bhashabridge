`npm install` fails with `ERESOLVE unable to resolve dependency tree` because one package needs React 18 while your project uses React 19. npm refuses to install two incompatible peer dependency versions.

First check whether a newer version of the package supports React 19:

```bash
npm view react-datepicker peerDependencies
```

If it does, upgrade that package. Only use `--legacy-peer-deps` as a temporary workaround, because it skips the check and the package may break at runtime.
