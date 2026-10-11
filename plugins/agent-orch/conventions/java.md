# Java Conventions

## Naming Conventions

### Casing Rules

| Element | Case | Example |
|---------|------|---------|
| Classes, Interfaces, Enums | PascalCase | `SecurityData`, `UserService` |
| Methods, Variables, Parameters | camelCase | `handleError`, `configValue` |
| Constants (static final) | CONSTANT_CASE | `MAX_BATCH_SIZE` |
| Packages | lowercase.dotted | `com.example.auth` |

### Naming Rules

- Do NOT prefix interfaces with `I` (use `UserService` not `IUserService`)
- Use descriptive names; avoid single-char except loop vars
- Boolean methods: use `is`, `has`, `can`, `should` prefixes
- Factory methods: use `of`, `from`, `create` prefixes

## Imports

- No wildcard imports (`import java.util.*`)
- Order: java.*, javax.*, third-party, project
- Remove unused imports

```java
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.example.models.User;
```

## Classes

### Structure

- One public class per file
- Order: constants, fields, constructors, public methods, private methods
- Use `final` for immutable fields
- Prefer composition over inheritance

```java
@Service
public class UserService {
    private final UserRepository repository;
    private final PasswordEncoder encoder;

    public UserService(UserRepository repository, PasswordEncoder encoder) {
        this.repository = repository;
        this.encoder = encoder;
    }

    public User getUser(String id) {
        return repository.findById(id)
            .orElseThrow(() -> new UserNotFoundException(id));
    }
}
```

### Records (Java 16+)

- Use records for immutable data carriers

```java
public record SecurityData(String securityId, Double lastPrice) {}
public record ApiResponse<T>(T data, boolean success) {}
```

## Error Handling

- Use checked exceptions for recoverable conditions
- Use unchecked (Runtime) exceptions for programming errors
- Create domain-specific exceptions
- Never catch `Exception` or `Throwable` without re-throwing

```java
public class UserNotFoundException extends RuntimeException {
    private final String userId;

    public UserNotFoundException(String userId) {
        super("User not found: " + userId);
        this.userId = userId;
    }
}

// Correct
try {
    return repository.findById(id);
} catch (DataAccessException e) {
    throw new ServiceException("Failed to fetch user: " + id, e);
}

// Incorrect
try {
    return repository.findById(id);
} catch (Exception e) {
    // swallowed
}
```

## Optionals

- Use `Optional` for return types that may not have a value
- Do NOT use `Optional` for method parameters or fields
- Use `orElseThrow` instead of `get()`

```java
public Optional<User> findUser(String id) {
    return repository.findById(id);
}

// Usage
User user = userService.findUser(id)
    .orElseThrow(() -> new UserNotFoundException(id));
```

## Streams

- Use streams for collection transformations
- Prefer method references when clear
- Keep stream pipelines short (< 5 operations)

```java
List<String> names = users.stream()
    .filter(User::isActive)
    .map(User::getName)
    .sorted()
    .toList();
```

## Testing

- Use JUnit 5 with AssertJ assertions
- Test naming: `methodName_shouldBehavior_whenCondition`
- Use `@Nested` for grouping related tests

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    @Mock private UserRepository repository;
    @InjectMocks private UserService service;

    @Test
    void getUser_shouldReturnUser_whenExists() {
        when(repository.findById("1")).thenReturn(Optional.of(testUser));
        User result = service.getUser("1");
        assertThat(result.getEmail()).isEqualTo("test@example.com");
    }

    @Test
    void getUser_shouldThrowNotFound_whenMissing() {
        when(repository.findById("1")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getUser("1"))
            .isInstanceOf(UserNotFoundException.class);
    }
}
```

## Constants

```java
public final class Constants {
    public static final int MAX_BATCH_SIZE = 1000;
    public static final Duration DEFAULT_TIMEOUT = Duration.ofSeconds(30);

    private Constants() {} // prevent instantiation
}
```
