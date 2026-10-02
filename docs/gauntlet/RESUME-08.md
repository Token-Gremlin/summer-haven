# Complete project handoff for owner testing

The owner requested every current project file in a new GitHub PR so the game
can be cloned into Cursor or another platform. No GitHub playable preview is
requested. Development iteration is paused for that test; packaging and
validation do not mean the complete world or its artistic criteria are passed.

## Repository state

- Branch: `feat/complete-playtest-handoff`.
- Base: `9571daaca71109c1eaf1392f8366301fa7fda2d6`, the existing merge of PR #2.
- The branch retains the full game and all earlier production assets. The diff
  from `main` contains the newer changes; unchanged files remain part of the
  branch and are included when cloning it.
- Road clearance and crowd escape fixes are included with their exact captured
  regressions. Their reports are `roadside-clearance-08.md` and
  `city-crowd-escape-08.md`.
- Deer revision 3 authoring remains separate under
  `tools/blender/wildlife/revision-3-draft`; production still uses revision 2.
  Editable scenes, reproducible scripts, exports, preservation scene and visual
  diagnostics are retained.
- New QA helpers, independent sampler review, and the failed journey's videos,
  screenshots and raw state are included. No failed attempt is relabeled a pass.

## Validation of this handoff

On Windows with the existing locked dependencies:

| Check | Result |
| --- | --- |
| `npm test` | 131 passed, 0 failed; 84,441.2349 ms |
| Draft `deer-gait.test.ts` | 7 passed, 0 failed; 9,446.7513 ms |
| `npm run build -- --outDir .cache/handoff-build` | Strict TypeScript and Vite build passed |
| Compiled gameplay bundle | `index-BoqztZFN.js` |
| New/updated QA helper syntax | All three checked helpers passed |

The alternate build directory preserves the previously served test bundle.
Ordinary `npm run build` in a fresh clone writes `dist/`. Vite reports a large
bundle warning; it is not a compilation failure or a performance measurement.
The existing GitHub workflow also runs a clean dependency install, tests and
the standard production build for the PR.

The asset draft's GLB SHA-256 is
`46e075749d14876c05d320327f6a1a3e181b92f3d8474fb97e766ba71d50a63e`.
Its reproducible Blender export is documented in
`evidence/wildlife-r3-authoring/record.md`. No runtime visual approval is implied
by draft tests.

## Known runtime failure and next work after owner feedback

Journey 07 failed after standing from the city bench near `(23, -333)`: the
seated flag clears but the player remains trapped in its solid collision.
The pause menu's **Return safely to my house** provides recovery. This issue
is deliberately documented in the playtest guide rather than hiding it or
claiming the complete journey passed. See `evidence/journey-07/record.md`.

After the owner resumes development, fix the seating/get-up lifecycle and
safe-save behavior, test actual outdoor/interior seats, and independently
review the integrated road, resident and seat repairs. Then restart the real
full-world journey on the new build. The active-city sampler needs an abort and
recovery smoke test before measurement under an exclusive hardware lock. The
new deer needs matched runtime comparison before production integration.

Whole-world craft, motion/audio, sustained busy-city performance, repeated-trip
memory and complete journey/persistence remain open. Historical 33–42 FPS Low
measurements describe the older build and declared reduced internal resolution;
they do not measure this new handoff or prove 60 FPS.

## Files and local-only state

All source, runtime GLBs, asset manifests, editable Blender production files,
draft work, tests, documentation and evidence are tracked. Dependency downloads,
reproducible compiled output, Python bytecode, automatic Blender backup files,
temporary caches/logs and private browser-save backups are local-only. They are
not needed to clone and run the game. See `../PLAYTEST.md` for exact commands.

The failed journey used only the disposable QA origin on port 4175. Its final
state is archived in the evidence directory. The original QA save backup is
local at `.cache/pre-resume-storage-07.json`; the normal development-origin
save was not changed. Before restoring that QA backup, unload the game to the
script-free `qa-storage.html` page, restore the exact raw saved value, then load
the game, so autosave cannot overwrite the restored value.
