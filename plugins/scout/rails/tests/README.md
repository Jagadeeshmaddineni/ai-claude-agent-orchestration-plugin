# Rails engine trap-case fixtures

Each `*.yaml` here is a self-contained trap case: a `(playbook, manifest, caller_tier,
step | conclusion)` input plus the `expected` rails decision. They document — and, via
`../check.py`, executably enforce — the contract in [`../RAILS.md`](../RAILS.md).

Every fixture names the RAILS.md gate it exercises. `must_not_appear_in_record` lists
substrings (secret/never_return values) that MUST NOT leak into the emitted DecisionRecord;
the harness fails the case if any appears.

| Fixture | Trap | Expected |
|---------|------|----------|
| `a-forbidden-free-form-prod-query.yaml` | (a) free-form prod query | `reject` @ A-safety |
| `b-never-return-value-blocked.yaml` | (b) never_return value in output | `reject` @ F-redaction |
| `c-business-denied-developer-step.yaml` | (c) business denied developer-only step | `reject` @ C-audience |
| `d-unmapped-capability-inert.yaml` | (d) unmapped capability | `inert` @ B-capability |
| `e-env-var-value-never-in-output.yaml` | (e) env-var value echoed | `reject` @ F-redaction |
| `f-business-cannot-upgrade-confidence.yaml` | (f) business upgrades `likely`→`confirmed` | `reject` @ D-confidence |
| `g-allow-with-mask.yaml` | positive path: allowed + masked | `allow` |
| `h-g9-unmapped-query-inert.yaml` | (G9) unmapped query resolves before safety | `inert` @ B-capability |
| `i-g9-mapped-allowlisted-proc-allow.yaml` | (G9) mapped allowlisted-proc query | `allow` (resolved_env: production) |
| `j-g9-mapped-free-form-reject.yaml` | (G9) mapped-but-free-form query | `reject` @ A-safety |
| `k-g10-misworded-never-return-builtin-blocks.yaml` | (G10) plural/mis-worded never_return; builtins block | `reject` @ F-redaction |
| `l-g10-field-path-blocks-exact-path.yaml` | (G10) structured `{field_path}` blocks exact path | `reject` @ F-redaction |
| `m-g10-builtins-off-not-blocked.yaml` | (G10) `builtins: off` toggle proof | `allow` |
| `n-g10-no-false-positive-on-legit-value.yaml` | (G10) built-ins don't over-redact legit output | `allow` |
| `o-g2-resolved-env-recorded.yaml` | (G2) DecisionRecord records `resolved_env` | `allow` (resolved_env: production) |
| `p-toolbox-resolve-allow.yaml` | (v0.4 §4.1) capability only in `investigation_toolbox` resolves | `allow` (resolved_from: investigation_toolbox) |
| `q-toolbox-free-form-reject.yaml` | (v0.4 §4.1 + §2.A.1) toolbox `query` bound free-form | `reject` @ A-safety |
| `r-toolbox-audience-gated.yaml` | (v0.4 §4.1 + Gate C) business denied developer-only toolbox tool | `reject` @ C-audience |
| `s-liveness-empty-downgrades.yaml` | (v0.4 §6.2) confirmed verdict on empty/no-op step downgraded | `allow` @ D-confidence (liveness: empty-or-no-op) |
| `t-liveness-unknown-no-downgrade.yaml` | (v0.4 §6.2) unknown liveness does NOT downgrade | `allow` (gate null) |

`expected.resolved_env` (when present) asserts the G2 environment label the record captured; it
is a code-controlled label (`production`/`non-production`/`<env>`), never fixture-derived data.
`expected.resolved_from` (v0.4) asserts which manifest section resolved the capability
(`capabilities`/`investigation_toolbox`); `expected.liveness` (v0.4) asserts the step-output
liveness label / conclusion downgrade marker. Both are code-controlled labels, never fixture data.
A conclusion fixture may carry an optional `step_records` map (step_id → that step's
DecisionRecord) so the §6.2 liveness guardrail can correlate the conclusion's `from_steps`.

## Run

```
python ../check.py        # or: python check.py from the rails/ dir
python ../check.py -v      # also print each emitted DecisionRecord
```

Requires `pyyaml`. Exit code is non-zero if any fixture's decision differs from expected
or if a secret/never_return value leaks into a DecisionRecord.
