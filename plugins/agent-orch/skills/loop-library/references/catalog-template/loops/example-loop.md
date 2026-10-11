---
name: Raise test coverage
slug: raise-coverage
use_when: Coverage is below target and you want to close the gap module by module.
tags: [testing, quality]
trigger: on request
verify: coverage report meets the agreed threshold
stop: every module meets the threshold, or a pass adds no coverage
approval: ask before changing CI config or shared test infrastructure
created: 2026-06-22
---

## Raise test coverage

Closes the coverage gap one module at a time, keeping only changes that
measurably raise coverage, and stops when every module meets the threshold or a
pass stops making progress.

Prompt:
> Pick the lowest-coverage module, add tests for one uncovered path, and re-run
> the coverage report. Keep the tests only if coverage rose. Repeat until every
> module meets the threshold or a pass adds no coverage. Ask before changing CI
> or shared test setup.
