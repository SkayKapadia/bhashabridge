Git stopped the merge because both branches changed the same lines in `src/config.ts`. This is a merge conflict, and Git needs you to decide which version to keep.

Open the file and look for the conflict markers:

```
<<<<<<< HEAD
export const API_URL = "https://api.example.com/v2";
=======
export const API_URL = "https://staging.example.com/v2";
>>>>>>> feature/staging
```

Keep the line you want, delete the markers, then run:

```bash
git add src/config.ts
git commit
```

If you are not sure, run `git merge --abort` to go back to the state before the merge.
