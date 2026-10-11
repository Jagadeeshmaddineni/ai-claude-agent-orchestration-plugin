# Quick Security Check

Perform a fast OWASP security check without launching a full security agent.

## What This Does

This lightweight command scans code for common security vulnerabilities:
- **OWASP Top 10** patterns
- SQL injection vulnerabilities
- Cross-Site Scripting (XSS) risks
- Authentication/authorization gaps
- Sensitive data exposure
- Insecure dependencies
- Common security anti-patterns

**This is NOT a replacement for comprehensive security audit**. Use this for:
- Quick pre-commit security check
- Catch obvious vulnerabilities early
- CI/CD security gate
- Developer self-service security scan

## When to Use

- Before committing code with auth/DB/API changes
- Quick check for OWASP Top 10 issues
- Pre-PR security validation
- After dependency updates
- Spot-check for common vulnerabilities

## How It Works

1. Scans changed files (or all files if specified)
2. Pattern-matches against OWASP Top 10 vulnerabilities
3. Checks for insecure library usage
4. Validates authentication/authorization patterns
5. Detects hardcoded secrets
6. Generates security report with severity levels

## Output Format

```markdown
# Quick Security Check Report

**Files Scanned**: [N files]
**Run Time**: [timestamp]
**OWASP Top 10 Checks**: [10/10]

## CRITICAL Vulnerabilities (Fix Immediately)

### SQL Injection (A03:2021-Injection)
- **File**: src/api/users.ts:45
  **Issue**: SQL query built with string concatenation
  **Code**: `const sql = "SELECT * FROM users WHERE id = " + userId`
  **Fix**: Use parameterized queries
  **Example**: `const sql = "SELECT * FROM users WHERE id = $1"; db.query(sql, [userId])`

### Hardcoded Secret (A02:2021-Cryptographic Failures)
- **File**: src/config/database.ts:12
  **Issue**: Hardcoded database password in source code
  **Code**: `password: 'super_secret_password'`
  **Fix**: Use environment variables
  **Example**: `password: process.env.DB_PASSWORD`

## HIGH Severity Issues

### Missing Authentication Check (A01:2021-Broken Access Control)
- **File**: src/api/admin.ts:23
  **Issue**: Admin endpoint has no authentication middleware
  **Route**: `POST /api/admin/delete-user`
  **Fix**: Add authentication middleware
  **Example**: `router.post('/admin/delete-user', requireAuth, requireAdmin, deleteUser)`

### XSS Vulnerability (A03:2021-Injection)
- **File**: src/views/profile.tsx:56
  **Issue**: Unsanitized user input rendered as HTML
  **Code**: `<div dangerouslySetInnerHTML={{__html: userBio}} />`
  **Fix**: Sanitize HTML or use text content
  **Example**: `import DOMPurify from 'dompurify'; <div dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(userBio)}} />`

## MEDIUM Severity Issues

### Insecure Dependency (A06:2021-Vulnerable Components)
- **Package**: lodash@4.17.15
  **Issue**: Known prototype pollution vulnerability (CVE-2020-8203)
  **Fix**: Upgrade to lodash@4.17.21 or higher
  **Command**: `npm update lodash`

### Weak Password Policy (A07:2021-Identification and Authentication Failures)
- **File**: src/auth/register.ts:34
  **Issue**: No password strength validation
  **Fix**: Add minimum length (12+) and complexity requirements

## Passed Checks
- ✅ No CSRF vulnerabilities detected
- ✅ HTTPS enforced in production
- ✅ Secure session cookies (httpOnly, secure, sameSite)
- ✅ No eval() or Function() usage
- ✅ Input validation on API endpoints

## OWASP Top 10 (2021) Coverage
| ID | Category | Findings | Status |
|----|----------|----------|--------|
| A01 | Broken Access Control | 1 HIGH | ⚠️ |
| A02 | Cryptographic Failures | 1 CRITICAL | ❌ |
| A03 | Injection | 2 CRITICAL | ❌ |
| A04 | Insecure Design | 0 | ✅ |
| A05 | Security Misconfiguration | 0 | ✅ |
| A06 | Vulnerable Components | 1 MEDIUM | ⚠️ |
| A07 | Authentication Failures | 1 MEDIUM | ⚠️ |
| A08 | Data Integrity Failures | 0 | ✅ |
| A09 | Logging Failures | 0 | ✅ |
| A10 | SSRF | 0 | ✅ |

## Summary
- **Total Issues**: 6
- **Critical**: 2
- **High**: 2
- **Medium**: 2
- **Security Status**: FAIL (critical issues found)
- **Ready to Commit**: NO
```

## Example Usage

```bash
# Check all changed files
/agent-orch:security-quick

# Check specific files
/agent-orch:security-quick --files="src/api/**/*.ts"

# Check dependencies only
/agent-orch:security-quick --dependencies-only

# Generate SARIF output for GitHub
/agent-orch:security-quick --format=sarif
```

## Vulnerability Categories Checked

### Injection
- SQL injection
- NoSQL injection
- Command injection
- LDAP injection
- XPath injection
- XML injection

### Authentication & Authorization
- Missing authentication checks
- Weak password policies
- Session fixation
- Insecure JWT usage
- Missing authorization checks

### Sensitive Data
- Hardcoded secrets
- Credentials in code
- API keys in source
- Unencrypted sensitive data
- Logging sensitive information

### Common Pitfalls
- `eval()` or `Function()` usage
- `dangerouslySetInnerHTML` without sanitization
- CORS misconfiguration
- Insecure random number generation
- Weak cryptography

## CI/CD Integration

```yaml
# .github/workflows/security.yml
- name: Quick security check
  run: claude code "/agent-orch:security-quick --format=sarif" --non-interactive

- name: Upload to GitHub Security
  uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: security-report.sarif

- name: Fail on critical issues
  run: exit $?
```

## Comparison: Security Quick vs Security Agent

| Feature | Security Quick | Security Agent |
|---------|---------------|----------------|
| **Time** | 1-2 minutes | 15-30 minutes |
| **Depth** | OWASP Top 10 patterns | Comprehensive threat model |
| **Output** | Vulnerability list | Threat model + mitigations |
| **Agents** | No agents (command) | Security agent |
| **Use Case** | Quick validation | Full security audit |
| **Coverage** | Common vulnerabilities | + Architecture, design flaws |

## Limitations

This command checks for **common, pattern-based vulnerabilities**. It cannot detect:
- Business logic flaws
- Complex authentication bypass
- Race conditions
- Timing attacks
- Advanced privilege escalation

For comprehensive security analysis, use `/agent-orch:build` with security agent for threat modeling.

## No Agent Overhead

This is a **command**, not a skill:
- No agent spawning
- Pattern-based detection
- Fast execution (1-2 minutes)
- Focused on OWASP Top 10

For threat modeling and comprehensive security audit, use security agent.
