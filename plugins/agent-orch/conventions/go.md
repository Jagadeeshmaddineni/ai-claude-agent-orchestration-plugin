# Go Conventions

## Naming Conventions

### Casing Rules

| Element | Case | Example |
|---------|------|---------|
| Exported (public) | PascalCase | `SecurityData`, `HandleError` |
| Unexported (private) | camelCase | `securityData`, `handleError` |
| Constants | PascalCase (exported) or camelCase | `MaxBatchSize`, `defaultTimeout` |
| Packages | lowercase, single word | `auth`, `user`, `config` |
| Interfaces (single method) | Method + "er" | `Reader`, `Writer`, `Validator` |

### Naming Rules

- Keep names short but descriptive
- Avoid stuttering: `user.User` not `user.UserStruct`
- Use `err` for error variables
- Use `ctx` for context.Context
- Receivers: short (1-2 char) abbreviations of the type

```go
// Correct
func (s *Server) handleRequest(ctx context.Context, req *Request) error {
    ...
}

// Incorrect - verbose receiver name
func (server *Server) handleRequest(ctx context.Context, req *Request) error {
    ...
}
```

## Package Organization

### Structure

- One package per directory
- Package name matches directory name
- Keep packages focused and small
- Internal packages for private code

```
project/
  cmd/server/main.go
  internal/
    auth/auth.go
    user/user.go
  pkg/
    client/client.go
```

### Imports

- Standard library first, then third-party, then local
- Use `goimports` for formatting
- Avoid dot imports

```go
import (
    "context"
    "fmt"
    "net/http"

    "github.com/gorilla/mux"
    "go.uber.org/zap"

    "myproject/internal/auth"
)
```

## Types

### Structs

- Use struct literals with field names
- Group related fields
- Use pointer receivers for methods that modify state

```go
// Correct
user := User{
    Name:  "John",
    Email: "john@example.com",
}

// Incorrect
user := User{"John", "john@example.com"}
```

### Interfaces

- Keep interfaces small (1-3 methods)
- Define interfaces where they're used, not where they're implemented
- Accept interfaces, return structs

```go
// Correct - small, focused interface
type UserStore interface {
    GetUser(ctx context.Context, id string) (*User, error)
}

// Service accepts interface
type UserService struct {
    store UserStore
}
```

## Error Handling

### Error Rules

- Always check errors; never ignore with `_`
- Wrap errors with context: `fmt.Errorf("failed to get user: %w", err)`
- Use sentinel errors for expected conditions
- Use custom error types for rich error information

```go
// Correct
var ErrNotFound = errors.New("not found")

func (s *UserService) GetUser(ctx context.Context, id string) (*User, error) {
    user, err := s.store.Find(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("get user %s: %w", id, err)
    }
    if user == nil {
        return nil, ErrNotFound
    }
    return user, nil
}

// Incorrect - ignored error
result, _ := s.store.Find(ctx, id)
```

## Functions

- Return early to reduce nesting
- Use named return values sparingly (only for documentation)
- Functions should be short and focused

```go
func validateEmail(email string) (string, error) {
    email = strings.TrimSpace(email)
    if email == "" {
        return "", errors.New("email cannot be empty")
    }
    if !strings.Contains(email, "@") {
        return "", errors.New("invalid email format")
    }
    return strings.ToLower(email), nil
}
```

## Concurrency

- Use goroutines for concurrent work
- Always use channels or sync primitives for coordination
- Use `context.Context` for cancellation
- Use `errgroup` for parallel operations with error handling

```go
g, ctx := errgroup.WithContext(ctx)
for _, id := range userIDs {
    id := id
    g.Go(func() error {
        return processUser(ctx, id)
    })
}
if err := g.Wait(); err != nil {
    return fmt.Errorf("process users: %w", err)
}
```

## Testing

- Use table-driven tests
- Test files: `*_test.go` in same package
- Use `testify` for assertions when helpful

```go
func TestValidateEmail(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        want    string
        wantErr bool
    }{
        {"valid email", "John@Example.com", "john@example.com", false},
        {"empty email", "", "", true},
        {"missing @", "invalid", "", true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := validateEmail(tt.input)
            if (err != nil) != tt.wantErr {
                t.Errorf("error = %v, wantErr %v", err, tt.wantErr)
            }
            if got != tt.want {
                t.Errorf("got %q, want %q", got, tt.want)
            }
        })
    }
}
```

## Constants

```go
const (
    MaxBatchSize   = 1000
    DefaultTimeout = 30 * time.Second
)

// Use iota for enumerations
type Status int

const (
    StatusPending Status = iota
    StatusActive
    StatusInactive
)
```
