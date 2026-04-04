# ASP.NET Core 10 Rewrite Scaffold

This folder contains the first scaffold for replacing the Node backend with ASP.NET Core 10.

Current scope:

- ASP.NET Core 10 web host
- PostgreSQL connection bootstrap from the existing environment variables
- EF Core schema mapping for `users`, `email_accounts`, `messages`, and `settings`
- `/health` endpoint
- `APP_BASE_PATH` support through `UsePathBase`
- OpenID Connect + cookie authentication scaffold
- Local user provisioning from OIDC claims
- `/auth/login`, `/auth/logout`, `/auth/me`
- `/api/accounts`
- `/api/messages` read/update/delete plus sync parity for the current local-mail architecture
- IMAP folder discovery, multi-folder import, stop requests, and SSE import progress
- compose/send mail through the local SMTP server and Sent-folder persistence
- hosted SMTP receive listeners on the configured local ports with inbox persistence
- automatic database creation and SQL migration application using the existing `database/migrations` files
- smoke-test project for basic route and auth-contract verification
- standalone migration-only startup mode via `--migrate-only`
- Docker image build that packages the .NET backend, SQL migrations, and built React frontend together

Not migrated yet:

- richer authenticated integration tests and seeded test fixtures
- transitive dependency warning cleanup for `MimeKit`
- optional STARTTLS parity on port `587`
- operational scripts for the .NET backend to replace Node-specific startup helpers

Next recommended slice:

1. Expand tests beyond smoke coverage to authenticated flows and import/send behavior.
2. Resolve the transitive MimeKit vulnerability warning from the MailKit dependency tree.
3. Decide whether to add STARTTLS parity on port 587 or keep the current pragmatic plaintext listener for local use.
4. Add repo-level scripts that point Docker/build flows at the .NET backend instead of the Node backend.

## Useful Commands

Build:

```powershell
dotnet build .\backend-dotnet\Mailler.Api\Mailler.Api.csproj
```

Run web host:

```powershell
dotnet run --project .\backend-dotnet\Mailler.Api\Mailler.Api.csproj
```

Build Docker image:

```powershell
docker build -f .\backend-dotnet\Dockerfile -t mailler-backend:latest .
```

Run database creation and SQL migrations only:

```powershell
dotnet run --project .\backend-dotnet\Mailler.Api\Mailler.Api.csproj -- --migrate-only
```