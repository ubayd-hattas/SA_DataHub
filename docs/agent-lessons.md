# Agent lessons

Read before starting a task.

## 27 November 2026

- Piping `npm test` into `grep` hides its exit code. Use `set -o pipefail` before chaining a commit onto tests. (S5: CI caught a failing commit.)
- After merging, the checkout is back on `main`. Check the branch before editing or testing. (W2, W3)
- Public claims about what a check covers need to match where it is called. The sourcing check runs only for some pages. (W3, caught in review)
- A count named after a town covers the whole municipality. Say so in titles. (S3, caught in review)
- The guard hook blocks any command whose text names the command-line production deploy, even inside a file being written. (T0)
- Delete `.next` after removing a route, or the type check reports the old one. (O3)
- Stop a local server on port 3111 before starting another, or you test the old one. (O1)
