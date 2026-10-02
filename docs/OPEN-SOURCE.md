# Open-source release

Summer Haven is an MIT-licensed browser game by **Token Gremlin**.

- [Source and editable assets](https://github.com/Token-Gremlin/summer-haven)
- [Play the public demo](https://summer-haven-demo.tokengremlin.chatgpt.site)
- [License](../LICENSE) and [third-party attribution](ATTRIBUTION.md)

## What is included

The public release includes the current game, all 15 editable Blender scenes,
GLB assets, modeling and export scripts, tests, real gameplay screenshots,
development recordings, and the labeled experimental archive. It includes the
woodland and seasonal-weather updates. No account, API key or paid asset is
required to build or play.

Original code, documentation and project-authored assets use the MIT license,
copyright 2026 Token Gremlin. Third-party work keeps its own notices, including
Summer Cycle, EZ Tree, Three.js and the ambientCG bark texture.

## A clean public history

The public repository begins with a reviewed release snapshot. Earlier Git
history and pull requests remain in a separate private archive, with an
additional local Git bundle backup. Historical commit hashes and PR numbers in
development notes describe that pre-release archive; they are not public refs.

This preserves the work without publishing old personal author metadata or
superseded diagnostic paths. Rewriting a branch alone would leave earlier
pull-request references and cached commits on GitHub. See
[GitHub's guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

If you worked with an earlier private clone, **clone this public repository
afresh**. Do not mirror-push its old branches, tags or history into this one.
Copy intended file changes into a fresh branch instead.

## Publication review

The release checks cover tracked files, complete compressed Blender scenes,
PNG text chunks, image metadata, common credential and personal-path patterns,
and the public commit identity. Images and sampled frames from the development
recordings are also visually reviewed. Personal browser profiles, local saves,
credentials and private backups remain outside Git. The public identity is
Token Gremlin with a GitHub noreply email.

The latest gameplay validation passed 161 automated tests, 23 browser checks,
TypeScript and a production build; see [climate QA](CLIMATE-QA.md). The release
pass changes presentation, licensing metadata and publication records, not
gameplay. Pattern scans supplement review; they are not a general security
certification.

Run `npm run check:publication` before sharing new files. Keep original third-party
notices when redistributing source or a compiled build.
