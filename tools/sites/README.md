# Sites demo

[Play Summer Haven](https://summer-haven-demo.tokengremlin.chatgpt.site), a public
browser game by **Token Gremlin**. No sign-in is required. Use a desktop browser
with WebGL2, keyboard and mouse. Graphics run on the visitor's device.

The publication contains the compiled browser game. The source, editable
Blender files and development archive live in the
[MIT-licensed repository](https://github.com/Token-Gremlin/summer-haven).
`demo.json` records the existing Site identity. Reuse it for updates.

## Prepare an update

1. Commit the intended source, run the relevant tests and `npm run build`.
2. Read the current Site and use the Sites plugin's source-opening workflow
   before changing its publishing checkout.
3. Run `node tools/sites/prepare-demo.mjs`. It copies `dist/` into the ignored
   `.cache/sites-demo/` checkout, preserves the Site identity, and records the
   source commit and SHA-256 inventory in `source.json`.
4. Use the Sites workflow to commit/push, package and save a version, then deploy
   it with the current public audience. A source push alone is not a deployment.
5. Confirm the native deployment succeeded and the access policy is public.

For a missing publishing checkout, restore existing Site source with the plugin
first. Keep source credentials in session memory and hidden standard input;
never commit tokens, cookies or browser profiles. Public visitor access does not
grant editing permissions.

On Windows, the packaging helper needs Git for Windows' `usr/bin` and `bin` on
the child process PATH. Use forward slashes in the absolute archive path and
`TAR_OPTIONS=--force-local` so GNU tar handles its drive letter as a local path.

Only `dist/` is served. `source.json`, the publication README and `.git` are
outside that directory. The game includes `THIRD-PARTY-NOTICES.txt`. Localhost
and the hosted game use separate browser-local saves.

## Validation

The current demo includes the woodland and climate updates: press **K** for
seasons, rain, snow and wind, or **T** for time of day. The climate round passed
161 automated tests, 23 browser checks, TypeScript, the production build and
the publication scan. See [climate QA](../../docs/CLIMATE-QA.md) for real captures
and the limits of local performance measurements.

The Site was initially tested privately before the owner authorized public
launch. Past version and deployment identifiers remain in private publication
records; the current source inventory links each build to its Git commit.
