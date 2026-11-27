# SA Data Hub

South African public data at sadatahub.tech. Next.js (App Router), TypeScript, Tailwind, JSON datasets in git. Vercel deploys every merge to `main`.

Read `docs/PRODUCT_DIRECTION.md` before changing what readers see. The current plan is `docs/plan-2026-12.md`. Lessons from earlier tasks are in `docs/agent-lessons.md` when it exists.

## Rules

- Never send a request to statssa.gov.za. Never read or print `.env` files.
- Every figure shows its source, the source's release date and the date checked. A figure that can't be traced to a held release is not shown.
- Do not publish anything derived from CEF data until CEF agrees.
- Never commit publisher files or Search Console exports.
- Plain English, short sentences, no em dashes.
- No new categories, no database migration, no rate limiting.

## Work

- One task, one branch, one pull request, with the task ID in the branch name and title.
- Commit messages are one plain sentence saying what changed and why, in the style of `git log`.
- Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run validate`, `npm run build`. For `scripts/fuel/`, also `python -m pytest -q scripts/fuel/tests`.
- UI changes are checked at 375 px and 1280 px, light and dark.
- Pull request bodies end with a `## Lesson` section.

## Merge policy

Protected paths: `next.config.js`, `middleware.*`, `.github/workflows/`, `vercel.json`, `package.json`, `package-lock.json`, `src/data/`, and any change that removes or renames a public URL.

Normal rule: the owner merges changes to protected paths.

For the tasks listed in `docs/plan-2026-12.md`, on 27 November 2026 the owner authorised Claude to merge them, protected paths included, once all of these hold: CI is green, the row's done-test passed on the branch, and a fresh reviewer found no blocker. Use a merge commit (`gh pr merge --merge --delete-branch`). After each merge, check the production deployment status. If it fails, stop merging and tell the owner.

This does not cover: closing pull requests or deleting unmerged branches, publishing the fuel estimate, anything that costs money, force pushes, or deploying from the command line.
