# Validation Commands

This guide lists the commands used to validate generated connector code.

## Build Check

Validates that the TypeScript code compiles without errors:

```bash
nx build connectors-[name]
```

**What it checks:**
- TypeScript compilation
- Type correctness
- Import resolution
- Module dependencies

**Expected output:**
- Success: Build completes with no errors
- Failure: Shows TypeScript errors with file:line references

## Lint Check

Validates code style and catches common issues:

```bash
nx lint connectors-[name]
```

**What it checks:**
- ESLint rules compliance
- Code style consistency
- Best practice violations
- Potential bugs

**Expected output:**
- Success: No linting issues
- Warnings: Style issues that don't break functionality
- Errors: Critical linting failures

## Lint Auto-fix

Automatically fixes linting issues where possible:

```bash
nx lint connectors-[name] --fix
```

**What it fixes:**
- Formatting issues
- Import sorting
- Unused variables
- Semicolons, quotes, etc.

**Note:** Some issues must be fixed manually

## Typical Validation Flow

1. Run build check first
2. If build fails, fix TypeScript errors
3. Once build passes, run lint check
4. Use lint auto-fix for style issues
5. Manually fix any remaining lint errors
6. Verify build still passes after fixes

## Exit Codes

- `0`: Success, no issues
- `1`: Failure, errors found
- `2`: Warnings only (lint)

## Common Error Patterns

### Missing imports
```
Cannot find module '@activepieces/pieces-framework'
```
**Fix**: Add missing import statement

### Type errors
```
Property 'foo' does not exist on type 'Bar'
```
**Fix**: Adjust type definition or add type guard

### Unused variables
```
'foo' is defined but never used
```
**Fix**: Remove or use the variable, or prefix with `_` if intentionally unused
