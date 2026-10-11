# Rust Conventions

## Naming Conventions

### Casing Rules

| Element | Case | Example |
|---------|------|---------|
| Types, Traits, Enums | PascalCase | `SecurityData`, `ErrorHandler` |
| Functions, Methods, Variables | snake_case | `handle_error`, `config_value` |
| Constants, Statics | SCREAMING_SNAKE_CASE | `MAX_BATCH_SIZE` |
| Modules, Crates | snake_case | `data_processor`, `auth_utils` |
| Lifetimes | short lowercase | `'a`, `'ctx` |

### Naming Rules

- Use descriptive names; abbreviations must be unambiguous
- Boolean functions: use `is_`, `has_`, `can_` prefixes
- Conversion methods: `to_`, `into_`, `as_`, `from_`

## Module Organization

```
src/
  lib.rs        # Library root
  main.rs       # Binary entry point
  models/
    mod.rs
    user.rs
  services/
    mod.rs
    auth.rs
```

### Imports

- Use `use` statements at the top
- Group: std, external crates, local modules
- Prefer specific imports over glob imports

```rust
use std::collections::HashMap;
use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

use crate::models::User;
use crate::services::auth;
```

## Types

### Structs

- Derive common traits: `Debug`, `Clone`, `Serialize`, `Deserialize`
- Use `pub` judiciously - expose minimal API

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityData {
    pub security_id: String,
    pub last_price: Option<f64>,
}
```

### Enums

- Use enums for variants, not stringly-typed values
- Implement `Display` for user-facing enums

```rust
#[derive(Debug, Clone)]
pub enum Status {
    Pending,
    Active,
    Inactive,
}
```

## Error Handling

### Error Rules

- Use `Result<T, E>` for fallible operations
- Use `?` operator for error propagation
- Define custom error types with `thiserror`
- Never use `.unwrap()` in production code (use `.expect()` with message if truly impossible)

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("user {0} not found")]
    NotFound(String),
    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("validation error: {0}")]
    Validation(String),
}

pub fn get_user(id: &str) -> Result<User, AppError> {
    let user = db.find(id).map_err(AppError::Database)?;
    user.ok_or_else(|| AppError::NotFound(id.to_string()))
}
```

## Ownership and Borrowing

- Prefer borrowing (`&T`) over ownership when possible
- Use `Clone` only when necessary
- Use `Arc` for shared ownership across threads
- Return owned types from constructors, borrowed from accessors

```rust
// Correct - borrow when reading
fn validate_email(email: &str) -> Result<String, AppError> {
    let trimmed = email.trim();
    if trimmed.is_empty() {
        return Err(AppError::Validation("email cannot be empty".into()));
    }
    Ok(trimmed.to_lowercase())
}
```

## Testing

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_email_valid() {
        let result = validate_email("John@Example.com");
        assert_eq!(result.unwrap(), "john@example.com");
    }

    #[test]
    fn test_validate_email_empty() {
        let result = validate_email("");
        assert!(result.is_err());
    }
}
```

## Async

- Use `tokio` runtime for async
- Use `async`/`.await` for I/O-bound operations
- Use `tokio::spawn` for concurrent tasks

```rust
async fn fetch_all_users(ids: &[String]) -> Result<Vec<User>, AppError> {
    let futures: Vec<_> = ids.iter().map(|id| fetch_user(id)).collect();
    let results = futures::future::try_join_all(futures).await?;
    Ok(results)
}
```
