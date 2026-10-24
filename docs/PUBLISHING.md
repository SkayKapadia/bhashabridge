# Publishing BhashaBridge

BhashaBridge is published on the **Visual Studio Marketplace** by the publisher `SunilKapadia`. Publishing and updating are free.

## Build the package

```bash
npm install
npm run test:unit
npm test
npm run package
```

`npm run package` bundles the extension with esbuild (`dist/extension.js`) and writes `bhashabridge-<version>.vsix` in the project folder. Only the bundle, `media/`, `glossary/`, README, CHANGELOG and LICENSE go into it (see `.vscodeignore`).

Before publishing, install the `.vsix` in VS Code (Extensions → **…** → **Install from VSIX…**) and go through [`MANUAL_TEST_CHECKLIST.md`](MANUAL_TEST_CHECKLIST.md).

## First release

1. Go to https://marketplace.visualstudio.com/manage and sign in.
2. Under the publisher **Sunil Kapadia (SunilKapadia)**, click **New extension** → **Visual Studio Code**.
3. Upload the `.vsix` file.
4. The Marketplace checks it, usually within a few minutes. The extension then appears at
   `https://marketplace.visualstudio.com/items?itemName=SunilKapadia.bhashabridge`
   and installs in VS Code by searching "BhashaBridge" or running `ext install SunilKapadia.bhashabridge`.

## Updates

1. Make and test your changes.
2. Raise `version` in `package.json` (`0.1.0` → `0.1.1` for fixes, `0.2.0` for new features) and add an entry at the top of `CHANGELOG.md`.
3. Run `npm run package`.
4. On https://marketplace.visualstudio.com/manage, open the **…** menu next to BhashaBridge → **Update**, and upload the new `.vsix`.

Users get the update automatically. A version number can only be used once.

### Updating from the terminal (optional)

Instead of the web page, you can publish with a Personal Access Token from https://dev.azure.com (free; Organization: **All accessible organizations**, scope: **Marketplace → Manage**):

```bash
npx vsce login SunilKapadia   # paste the token when asked; never commit or share it
npx vsce publish              # builds, packages and publishes in one step
```

The token expires (at most after a year); create a new one and log in again.

## Open VSX (optional)

For VSCodium, Cursor and other editors that use Open VSX: sign in at https://open-vsx.org with GitHub, create a namespace `SunilKapadia` and a token, then:

```bash
npx ovsx publish bhashabridge-<version>.vsix -p <token>
```

## Preview badge

`"preview": true` in `package.json` shows a **Preview** badge on the Marketplace. Remove it when BhashaBridge reaches 1.0.
