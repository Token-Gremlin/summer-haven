# Contributing to Summer Haven

Welcome! Summer Haven is a browser exploration game about quiet places, familiar
faces and the small things that make a world feel inhabited. Contributions to
art, animation, accessibility, rendering, sound, documentation and testing are
welcome.

## Start here

1. Follow the [local setup](README.md#play-locally) and explore the game.
2. Read the [playtest guide](docs/PLAYTEST.md) for controls, places and known issues.
3. For larger changes, open an issue describing the player experience you want
   to improve. A screenshot or a short reproducible example helps.
4. Create a branch, make a focused change, and open a pull request against `main`.

Use English for shared documentation, issues and pull requests. Be considerate
and specific in feedback. Discuss the work, respect other contributors, and
keep private information out of public conversations.

## Run and validate

Use Node.js 24 and npm. Blender is needed only when authoring source assets.

```sh
npm ci
npm run dev
npm test
npm run build
npm run check:publication
```

For gameplay changes, exercise the affected controls in the browser. For visual
changes, inspect the actual result and attach a representative screenshot.
Record the graphics settings and whether a view is gameplay, photo mode or a
Blender render. Do not infer frame rate from a screenshot or a compiled build.
The [QA archive](docs/gauntlet/HANDOFF-10.md) records measured results and limits.

An optional browser suite is available with `npm run test:browser` after
`npx playwright install chromium`. Keep tests focused on meaningful behavior.

## Work with the project

- Keep systems in their existing modules; see the [architecture guide](docs/ARCHITECTURE.md).
- Keep scene populations, GPU buffers and repeated geometry bounded. Test
  changes on Low as well as higher settings.
- Keep appearance and saved-data changes backward compatible, or add a safe
  migration. Never commit a personal browser save.
- Preserve source Blender scenes and reproducible scripts alongside GLB exports.
  Follow the [asset workshop](tools/blender/README.md) and existing asset contracts.
- Preserve unsuccessful experiments and their context in the development archive;
  do not present draft assets as shipped game content.
- Keep the world cohesive. Improving an existing place is often more valuable
  than adding a large new region.

## Before sharing files

Use repository-relative paths in logs and documentation. Remove personal email
addresses, local home directories, credentials, browser profiles and unrelated
desktop content from attachments. Configure Git's author email to your GitHub
`noreply` address if you do not want your personal email in public commits.

`npm run check:publication` checks tracked files for common credential and
personal-path patterns, including compressed Blender files. It is a useful guard,
not a guarantee that all private information has been found.

## Licensing

Contributions to the project's original code, documentation and assets are
provided under the [MIT license](LICENSE). Contribute only work you have the
right to share. Retain third-party notices and document any new dependency or
asset in [Attribution](docs/ATTRIBUTION.md). Existing third-party licenses continue
to apply; the project's MIT license does not replace them.
