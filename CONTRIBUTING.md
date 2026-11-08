# Contributing to SA Data Hub

Thanks for helping. The most useful contributions, in order:

1. **Corrections.** If a figure, date or source looks wrong, use the [error report form](https://github.com/ubayd-hattas/SA_DataHub/issues/new?template=error-report.yml) with the page and, if you know it, the release and page where you saw the right figure. Fixes are listed publicly on [/updates](https://sadatahub.tech/updates).
2. **Requests.** Ask for a dataset, place or tool with the [data request form](https://github.com/ubayd-hattas/SA_DataHub/issues/new?template=data-request.yml). Say what you would use it for.
3. **Code.** Open an issue before a large pull request, so we can agree on the approach first.

## Rules for data

- Every figure needs its source, the source's release date and the date it was checked. `npm run build` fails without them.
- Data comes from official published releases, entered by hand. Do not add code that makes automated requests to statssa.gov.za.
- Quote the source's reason for a change, with its page. No forecasts or guesses.
- Release PDFs and workbooks stay out of the repository. Keep them in `sources/releases/`, which is ignored.

The step-by-step process for each dataset is in [docs/RUNBOOK.md](docs/RUNBOOK.md).

## Before you open a pull request

```bash
npm test
npm run lint
npx tsc --noEmit
npm run validate
npm run build
```

CI runs the same checks. Keep each commit to one change, with a plain message such as "Add the October CPI explainer".
