# Database Migration Check

Validate database migrations without launching a full database agent.

## What This Does

This lightweight command validates database migrations and provides a safety report:
- Migration file syntax validation
- Schema change impact analysis
- Rollback script presence
- Breaking change detection
- Index and foreign key checks
- Duplicate migration detection

**This is NOT a replacement for the full database agent**. Use this for:
- Quick migration validation before commit
- Pre-deployment safety check
- CI/CD migration gate
- Spot dangerous migrations early

## When to Use

- After creating new migration
- Before committing migration files
- Pre-deployment validation
- Quick safety check before merge
- Verify rollback script exists

## How It Works

1. Detects migration framework (Knex, TypeORM, Sequelize, Prisma, raw SQL)
2. Validates migration file syntax
3. Analyzes schema changes for breaking changes
4. Checks for rollback/down migration
5. Identifies potentially slow operations
6. Generates safety report

## Output Format

```markdown
# Database Migration Check Report

**Migration Framework**: [Knex/TypeORM/Sequelize/etc.]
**Migrations Found**: [N files]
**Run Time**: [timestamp]

## New Migrations
- [2026_03_28_001_add_users_table.sql]
- [2026_03_28_002_add_sessions_table.sql]

## Safety Analysis

### CRITICAL Issues (Fix Before Deploy)
- **Migration**: 2026_03_28_001_add_users_table.sql
  **Issue**: Missing rollback/down migration
  **Impact**: Cannot rollback if deployment fails
  **Fix**: Add down migration

### HIGH Priority Issues
- **Migration**: 2026_03_28_003_add_index.sql
  **Issue**: `CREATE INDEX` without `CONCURRENTLY` on large table
  **Impact**: Table locked during index creation, downtime expected
  **Fix**: Use `CREATE INDEX CONCURRENTLY`

### MEDIUM Priority Issues
- **Migration**: 2026_03_28_002_add_sessions_table.sql
  **Issue**: Foreign key without index on referenced column
  **Impact**: Slow queries on joins
  **Fix**: Add index on `user_id` before creating FK

## Breaking Changes Detected
- **Migration**: 2026_03_28_004_rename_column.sql
  **Change**: Renaming column `user_name` → `name`
  **Impact**: Breaks existing queries referencing `user_name`
  **Recommendation**: Use column alias or dual-write pattern

## Performance Warnings
- **Migration**: 2026_03_28_005_alter_table.sql
  **Operation**: `ALTER TABLE users ADD COLUMN status VARCHAR(50)`
  **Impact**: Full table rewrite on PostgreSQL < 11
  **Estimate**: ~30s for 1M rows
  **Recommendation**: Add with default NULL, backfill separately

## Validation Results
- ✅ All migration files have valid SQL syntax
- ✅ No duplicate migration timestamps
- ⚠️ 1 migration missing rollback script
- ⚠️ 2 potentially slow operations detected
- ✅ Foreign key constraints valid

## Summary
- **Safety Level**: MEDIUM RISK
- **Ready to Deploy**: NO (fix CRITICAL issues first)
- **Estimated Migration Time**: ~45 seconds
```

## Example Usage

```bash
# Check all new migrations
/agent-orch:db-migration-check

# Check specific migration
/agent-orch:db-migration-check --file="migrations/2026_03_28_001.sql"

# Dry-run migration (test against local DB)
/agent-orch:db-migration-check --dry-run

# Check for breaking changes only
/agent-orch:db-migration-check --breaking-only
```

## What Gets Checked

### Safety Checks
- [ ] Rollback/down migration exists
- [ ] No table locking operations (use CONCURRENTLY)
- [ ] No column drops without deprecation period
- [ ] Foreign keys have indexes
- [ ] Large data migrations chunked
- [ ] No direct data manipulation in schema migrations

### Breaking Change Detection
- Column renames
- Column type changes
- Table renames
- Constraint additions (NOT NULL, UNIQUE)
- Index drops
- Column drops

### Performance Checks
- Full table rewrites
- Index creation without CONCURRENTLY
- Missing indexes on foreign keys
- Large backfills in single transaction
- Expensive default value computations

## Migration Safety Guidelines

**DO**:
- ✅ Create indexes concurrently: `CREATE INDEX CONCURRENTLY`
- ✅ Add columns as NULL first, backfill, then add NOT NULL
- ✅ Use separate migrations for schema and data changes
- ✅ Write rollback scripts for all migrations
- ✅ Test on production-like data volume

**DON'T**:
- ❌ Rename columns directly (use alias transition)
- ❌ Drop columns immediately (deprecate first)
- ❌ Add NOT NULL without default in single step
- ❌ Create indexes synchronously on large tables
- ❌ Mix schema and data changes

## CI/CD Integration

```yaml
# .github/workflows/migrations.yml
- name: Validate migrations
  run: claude code "/agent-orch:db-migration-check" --non-interactive

- name: Fail on critical issues
  run: exit $?

- name: Dry-run migrations
  run: |
    docker-compose up -d postgres
    claude code "/agent-orch:db-migration-check --dry-run"
```

## Comparison: Migration Check vs Database Agent

| Feature | Migration Check | Database Agent |
|---------|-----------------|----------------|
| **Time** | < 1 minute | 5-15 minutes |
| **Scope** | Validate existing migrations | Write migrations |
| **Output** | Safety report | Migrations + report |
| **Agents** | No agents (command) | Database agent |
| **Use Case** | Validate before deploy | Create migrations |
| **Dry-Run** | Yes (optional) | Yes (always) |

## No Agent Overhead

This is a **command**, not a skill:
- No agent spawning
- No migration writing
- Fast validation (< 1 minute)
- Focused safety checks

For creating migrations, use `/agent-orch:build` with database agent.
