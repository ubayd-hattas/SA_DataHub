## What this changes

<!-- One or two sentences. Link the issue if there is one. -->

## Data checklist

Delete this section if no figure, date or source changed.

- [ ] Every new or changed figure names its source, the source's release date and the date it was checked
- [ ] The release file is in `sources/releases/` (not committed) and the PR says which table and page each figure came from
- [ ] Revised values from the publisher are recorded in the statistic's `revisions`
- [ ] There is an entry in `src/data/update-history.ts` for `/updates`

## Checks

- [ ] `npm test`
- [ ] `npm run lint` and `npx tsc --noEmit`
- [ ] `npm run validate`
- [ ] `npm run build`
- [ ] For page changes: looked at it at phone width (390px) and on a desktop
