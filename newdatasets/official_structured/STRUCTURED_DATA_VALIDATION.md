# SA Data Hub: Structured Data Validation

## Source Inventory & Official Download Sources

An attempt was made to locate the official Stats SA structured time series data (Excel/CSV) corresponding to the new releases. As established in the source manifest, **no authoritative structured files were found online**.

## Recommended Migration

In accordance with the strict requirement that we do not transcribe from PDFs and only use authoritative structured data, all datasets have been flagged for manual review or as DO NOT INGEST until the structured source files can be obtained or provided.

| Dataset    | Structured source found | Exact mapping verified | Historical comparison | Migration recommendation | Confidence      |
| ---------- | ----------------------- | ---------------------- | --------------------- | ------------------------ | --------------- |
| Education  | NO                      | NO                     | NO                    | MANUAL REVIEW REQUIRED   | LOW             |
| CPI        | NO                      | NO                     | NO                    | MANUAL REVIEW REQUIRED   | LOW             |
| QLFS       | NO                      | NO                     | NO                    | MANUAL REVIEW REQUIRED   | LOW             |
| GDP        | NO                      | NO                     | NO                    | MANUAL REVIEW REQUIRED   | LOW             |
| GHS        | NO                      | NO                     | NO                    | MANUAL REVIEW REQUIRED   | LOW             |
| Population | NO                      | NO                     | NO                    | MANUAL REVIEW REQUIRED   | LOW             |
| Crime      | NO                      | NO                     | NO                    | DO NOT INGEST            | LOW             |

## Remaining Manual Review

Because the official structured Excel time series could not be sourced, we cannot satisfy the evidence chain (Official publication → official structured file → sheet → table → row → column → value). 

No migration can proceed until the authoritative structured data is supplied, as falling back to PDF extraction violates the core principle of this phase.
