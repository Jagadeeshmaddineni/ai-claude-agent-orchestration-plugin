# Python Conventions

## Naming Conventions

### Casing Rules

| Element | Case | Example |
|---------|------|---------|
| Classes, Exceptions | PascalCase | `SecurityData`, `ValidationError` |
| Functions, Methods, Variables | snake_case | `handle_error`, `config_value` |
| Constants (module-level) | CONSTANT_CASE | `MAX_BATCH_SIZE`, `DEFAULT_TIMEOUT` |
| Modules, Packages | snake_case | `data_processor`, `auth_utils` |
| Private attributes | leading underscore | `_internal_cache` |

### Naming Rules

- Do NOT use Hungarian notation (`str_name`, `lst_items`)
- Do NOT use single-char names except in comprehensions, lambdas, loop vars
- Use descriptive names; abbreviations must be unambiguous
- Boolean variables/functions: use `is_`, `has_`, `can_`, `should_` prefixes

## Imports

### Organization

- Standard library first, then third-party, then local
- Separate groups with blank lines
- Use absolute imports over relative imports
- Import specific names, not entire modules (unless module is the API)

```python
# Correct
import os
from pathlib import Path
from typing import Optional

import requests
from pydantic import BaseModel

from app.models import User
from app.utils import validate_email

# Incorrect
from os import *
import app.models
```

### Import Rules

- Do NOT use wildcard imports (`from module import *`)
- Do NOT use relative imports (`from . import module`) except in `__init__.py`
- Group `from` imports from the same module

## Type Hints

### When to Annotate

- Always annotate function parameters and return types
- Annotate class attributes
- Use `Optional[T]` for values that can be None
- Use `Union` sparingly; prefer protocol/ABC-based polymorphism

```python
# Correct
def get_user(user_id: str) -> Optional[User]:
    ...

def process_items(items: list[str]) -> dict[str, int]:
    ...

# Incorrect - missing annotations
def get_user(user_id):
    ...
```

### Modern Type Hints (Python 3.10+)

- Use `X | Y` instead of `Union[X, Y]`
- Use `X | None` instead of `Optional[X]`
- Use lowercase builtins: `list`, `dict`, `tuple`, `set`

```python
# Modern
def fetch(url: str) -> dict[str, str] | None:
    ...

# Legacy
from typing import Optional, Dict
def fetch(url: str) -> Optional[Dict[str, str]]:
    ...
```

## Functions

### Style Rules

- Functions should do one thing
- Maximum function length: ~20 lines (guideline, not hard rule)
- Use keyword arguments for functions with >3 parameters
- Return early to reduce nesting

```python
# Correct - early return
def validate_email(email: str) -> str:
    if not email:
        raise ValueError("Email cannot be empty")
    if "@" not in email:
        raise ValueError("Invalid email format")
    return email.strip().lower()

# Incorrect - deep nesting
def validate_email(email: str) -> str:
    if email:
        if "@" in email:
            return email.strip().lower()
        else:
            raise ValueError("Invalid email format")
    else:
        raise ValueError("Email cannot be empty")
```

### Decorators

- Use `@staticmethod` for methods that don't use instance state
- Use `@classmethod` for alternative constructors
- Use `@property` for computed attributes

## Classes

### Structure

```python
class UserService:
    """Service for user operations."""

    def __init__(self, db: Database) -> None:
        self._db = db

    def get_user(self, user_id: str) -> User:
        """Get user by ID. Raises NotFoundError if not found."""
        user = self._db.users.find(user_id)
        if not user:
            raise NotFoundError(f"User {user_id} not found")
        return user
```

### Dataclasses

- Prefer `@dataclass` or Pydantic `BaseModel` over plain classes for data
- Use `frozen=True` for immutable data

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class SecurityData:
    security_id: str
    last_price: float | None = None
```

## Error Handling

### Exception Rules

- Catch specific exceptions, never bare `except:`
- Always raise from context: `raise NewError() from original`
- Create domain-specific exception classes
- Include context in error messages

```python
# Correct
class UserNotFoundError(Exception):
    def __init__(self, user_id: str) -> None:
        super().__init__(f"User {user_id} not found")
        self.user_id = user_id

try:
    result = api_client.get(url)
except requests.RequestException as e:
    raise ServiceUnavailableError(f"API call failed: {url}") from e

# Incorrect
try:
    result = api_client.get(url)
except:
    pass
```

### Validation

- Validate at boundaries (API input, file I/O, external data)
- Use Pydantic for input validation when available
- Return validated/normalized values

## Constants

```python
# Module-level constants
MAX_BATCH_SIZE = 1000
DEFAULT_TIMEOUT = 30
VALID_STATUSES = frozenset({"active", "inactive", "pending"})

# Configuration groups
class Config:
    DATABASE_URL: str = "postgresql://localhost/app"
    REDIS_URL: str = "redis://localhost:6379"
```

## Control Flow

### Truthiness

- Use truthiness for empty checks: `if items:` not `if len(items) > 0`
- Use `is None` / `is not None` for None checks (not `== None`)
- Use `not` for boolean negation

### Comprehensions

- Use list/dict/set comprehensions for simple transformations
- Use `for` loops for complex logic or side effects
- Maximum one level of nesting in comprehensions

```python
# Correct
names = [user.name for user in users if user.is_active]
lookup = {user.id: user for user in users}

# Too complex - use a loop instead
result = [
    transform(item)
    for group in groups
    for item in group.items
    if item.is_valid and item.category in allowed_categories
]
```

### Context Managers

- Use `with` for resource management (files, connections, locks)

```python
with open("config.json") as f:
    config = json.load(f)
```

## Testing

### Structure

- Use pytest (not unittest)
- Test files: `test_<module>.py`
- Test functions: `test_<behavior>_when_<condition>`
- Use fixtures for setup, not setUp/tearDown

```python
# Correct
def test_get_user_returns_user_when_exists(db_session):
    user = create_user(db_session, email="test@example.com")
    result = user_service.get_user(user.id)
    assert result.email == "test@example.com"

def test_get_user_raises_not_found_when_missing(db_session):
    with pytest.raises(UserNotFoundError):
        user_service.get_user("nonexistent")
```

## Async

- Use `async`/`await` for I/O-bound operations
- Never mix sync and async in the same function
- Use `asyncio.gather` for concurrent operations

```python
async def fetch_all_users(user_ids: list[str]) -> list[User]:
    tasks = [fetch_user(uid) for uid in user_ids]
    return await asyncio.gather(*tasks)
```
