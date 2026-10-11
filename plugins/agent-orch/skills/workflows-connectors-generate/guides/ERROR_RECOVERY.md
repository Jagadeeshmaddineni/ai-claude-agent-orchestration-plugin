# Error Recovery Strategy

This guide explains how to handle errors gracefully during connector generation.

## Core Principle

**Never fail completely**. Always provide a path forward for the user.

## Recovery Steps

### 1. Try to auto-fix common issues

When encountering errors during code generation or validation, attempt automatic fixes for:

- **Missing imports**: Add appropriate imports from framework
- **Type guards for optional fields**: Add `if (props.field)` checks before using optional properties
- **Missing exports**: Add missing exports to index.ts files
- **Simple type mismatches**: Adjust obvious type errors (e.g., string vs number)

### 2. If can't fix → offer user choice

When automatic fixes fail or aren't applicable, present the user with clear options:

1. **Show me the errors** - Display detailed error information for manual fixing
2. **Regenerate problematic files** - Ask for additional information and regenerate
3. **Use type placeholders** - Continue with 'any' types and TODO comments
4. **Skip validation** - Proceed anyway, user will fix later

### 3. Always provide path forward

For each error scenario, include:
- Clear explanation of what went wrong
- Why it likely occurred
- Multiple options for resolution
- Commands to run for verification

### 4. Document what needs manual attention

When using placeholders or skipping validation:
- Add TODO comments in code
- List all issues in output
- Provide search terms to find issues later
- Include commands to run for fixing

## Error Categories

### API Documentation Errors
**Cause**: Incomplete or unclear API documentation

**Recovery**:
- Offer to switch to Path B (user provides docs)
- Generate with placeholders
- Ask specific questions about missing information

### Type Inference Errors
**Cause**: Complex types that can't be automatically inferred

**Recovery**:
- Use 'any' type with TODO comment
- Note specific fields needing type definition
- Suggest examining API responses manually

### Build Errors
**Cause**: Generated code doesn't compile

**Recovery**:
- Attempt auto-fix for common patterns
- Show detailed errors with file:line references
- Offer regeneration with more information

### Lint Errors
**Cause**: Code doesn't meet style guidelines

**Recovery**:
- Run `nx lint --fix` automatically
- Show remaining issues if any
- Generally less critical, can be warnings

## Example Error Flow

```
❌ Error detected
   ↓
✓ Attempt auto-fix
   ↓
Still failing?
   ↓
Present 4 options to user
   ↓
User chooses option
   ↓
Execute chosen recovery path
   ↓
✅ Provide clear next steps
```

## Important Notes

- Always be transparent about what went wrong
- Never leave user stuck without options
- Document all workarounds clearly
- Prioritize user productivity over perfection
