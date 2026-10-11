# C# Conventions

## Naming Conventions

### Casing Rules

| Element | Case | Example |
|---------|------|---------|
| Classes, Interfaces, Enums, Methods | PascalCase | `SecurityData`, `HandleError` |
| Parameters, Local variables | camelCase | `userId`, `configValue` |
| Constants | PascalCase | `MaxBatchSize`, `DefaultTimeout` |
| Private fields | _camelCase | `_repository`, `_logger` |
| Interfaces | IPascalCase | `IUserService`, `IRepository` |

### Naming Rules

- DO prefix interfaces with `I`
- DO use meaningful names; avoid abbreviations except common ones (Id, Url, Http)
- Boolean properties/methods: use `Is`, `Has`, `Can` prefixes

## Imports (Usings)

- System namespaces first, then third-party, then project
- Use global usings for common namespaces (C# 10+)
- Remove unused usings

```csharp
using System;
using System.Collections.Generic;

using Microsoft.Extensions.Logging;

using MyApp.Models;
using MyApp.Services;
```

## Classes

### Structure

```csharp
public class UserService : IUserService
{
    private readonly IUserRepository _repository;
    private readonly ILogger<UserService> _logger;

    public UserService(IUserRepository repository, ILogger<UserService> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task<User> GetUserAsync(string id)
    {
        var user = await _repository.FindByIdAsync(id);
        return user ?? throw new UserNotFoundException(id);
    }
}
```

### Records (C# 9+)

- Use records for immutable data
- Use `record struct` for small value types

```csharp
public record SecurityData(string SecurityId, decimal? LastPrice);
public record ApiResponse<T>(T Data, bool Success);
```

## Async/Await

- Suffix async methods with `Async`
- Always use `async`/`await` (never `.Result` or `.Wait()`)
- Use `CancellationToken` for cancellable operations
- Return `Task` not `void` from async methods

```csharp
public async Task<User> GetUserAsync(string id, CancellationToken ct = default)
{
    return await _repository.FindByIdAsync(id, ct)
        ?? throw new UserNotFoundException(id);
}
```

## Error Handling

- Create domain-specific exceptions
- Use `throw;` to preserve stack trace (not `throw ex;`)
- Validate at boundaries

```csharp
public class UserNotFoundException : Exception
{
    public string UserId { get; }

    public UserNotFoundException(string userId)
        : base($"User {userId} not found")
    {
        UserId = userId;
    }
}

// Correct
try
{
    return await _repository.FindByIdAsync(id);
}
catch (DbException ex)
{
    _logger.LogError(ex, "Failed to fetch user {UserId}", id);
    throw; // preserves stack trace
}
```

## LINQ

- Use method syntax for complex queries
- Use query syntax for joins
- Keep chains readable (one operation per line)

```csharp
var activeNames = users
    .Where(u => u.IsActive)
    .OrderBy(u => u.Name)
    .Select(u => u.Name)
    .ToList();
```

## Nullable Reference Types

- Enable nullable reference types project-wide
- Use `?` for nullable types
- Check nullability at boundaries

```csharp
public User? FindUser(string id)  // explicitly nullable
{
    return _repository.Find(id);
}

public User GetUser(string id)  // non-null guaranteed
{
    return FindUser(id) ?? throw new UserNotFoundException(id);
}
```

## Testing

- Use xUnit with FluentAssertions
- Test naming: `MethodName_Should_When`
- Use `[Theory]` for parameterized tests

```csharp
public class UserServiceTests
{
    private readonly Mock<IUserRepository> _repository = new();
    private readonly UserService _sut;

    public UserServiceTests()
    {
        _sut = new UserService(_repository.Object);
    }

    [Fact]
    public async Task GetUserAsync_ShouldReturnUser_WhenExists()
    {
        _repository.Setup(r => r.FindByIdAsync("1", default))
            .ReturnsAsync(TestUser);
        var result = await _sut.GetUserAsync("1");
        result.Email.Should().Be("test@example.com");
    }

    [Fact]
    public async Task GetUserAsync_ShouldThrow_WhenNotFound()
    {
        _repository.Setup(r => r.FindByIdAsync("1", default))
            .ReturnsAsync((User?)null);
        var act = () => _sut.GetUserAsync("1");
        await act.Should().ThrowAsync<UserNotFoundException>();
    }
}
```

## Constants

```csharp
public static class Constants
{
    public const int MaxBatchSize = 1000;
    public static readonly TimeSpan DefaultTimeout = TimeSpan.FromSeconds(30);
}
```
