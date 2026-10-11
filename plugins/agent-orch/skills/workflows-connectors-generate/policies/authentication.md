# Authentication Policies

## 1. Single Authentication Method (NON-NEGOTIABLE)

**Rule**: Each connector must have exactly one authentication method.

**Rationale**: Framework design limitation - the connector architecture supports a single auth definition per connector.

**Application**:
- If service offers multiple auth types (OAuth2 + API Key), choose one
- Document the choice in connector README

---

## 2. Auth Type Preference

**Rule**: Prefer OAuth2 when available.

**Rationale**: OAuth2 provides better security (secrets stay server-side), automatic token refresh, and better user experience with popup authorization flow.

**Application**:
- If service supports OAuth2, select it as the authentication method
- If OAuth2 is not available, use API Key or Custom auth as appropriate

---

## 3. OAuth2 Scope Minimization

**Rule**: Request only the minimum scopes required for implemented actions/triggers.

**Rationale**: Principle of least privilege - reduces security risk and increases user trust. Over-requesting permissions can cause users to reject authorization.

**Application**:
- **Timing**: Determine scopes AFTER implementing all actions/triggers
- Review what API endpoints are called across all actions/triggers
- Request only scopes that cover those endpoints
- Document required scopes in connector README

**Example**:
```typescript
// Implementing: create-issue, list-repos
scopes: ['repo']  // Sufficient

// Don't request: 'admin:org' (not needed for implemented actions)
```

---

## 4. Authentication Validation

**Rule**: Include authentication validation (recommended default).

**Rationale**: Validates credentials during setup, providing immediate feedback to users if configuration is incorrect. Reduces support issues from misconfigured connectors.

**Application**:
- Prompt user: "Include validation? (Y/n)"
- Default to Yes
- Use lightweight endpoint for validation (e.g., `/user/me`, `/account`)

---

**Last Updated**: 2025-01-10
