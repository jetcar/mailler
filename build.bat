@echo off
setlocal enabledelayedexpansion

REM Usage:
REM   build.bat [tag]
REM Example:
REM   build.bat v1.0.0

set "IMAGE_TAG=%~1"

where docker >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Docker CLI not found in PATH.
  exit /b 1
)

echo [STEP] Checking Docker daemon...
docker info >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Docker daemon is not reachable. Start Docker Desktop and retry.
  exit /b 1
)

if "%IMAGE_TAG%"=="" (
  call :resolve_next_tag
  if errorlevel 1 exit /b 1
)

set "BACKEND_IMAGE=mailler-backend:%IMAGE_TAG%"

echo [INFO] Using tag: %IMAGE_TAG%
echo [INFO] Backend image: %BACKEND_IMAGE%
echo.

echo [STEP] Building backend image...
docker build -f backend-dotnet/Dockerfile -t "%BACKEND_IMAGE%" .
if errorlevel 1 (
  echo [ERROR] Backend image build failed.
  exit /b 1
)



echo.
echo [SUCCESS] Build completed.
echo [SUCCESS] %BACKEND_IMAGE%

endlocal
exit /b 0

:resolve_next_tag
set "HAS_SEMVER_TAG="
set "HAS_INTEGER_TAG="
set /a HIGHEST_SEMVER_WEIGHT=-1
set /a HIGHEST_INTEGER_TAG=-1

for /f "usebackq delims=" %%T in (`docker image ls mailler-backend --format "{{.Tag}}"`) do (
  set "CURRENT_TAG=%%T"

  if /i not "!CURRENT_TAG!"=="<none>" (
    call :try_parse_semver "!CURRENT_TAG!"
    if not errorlevel 1 (
      set "HAS_SEMVER_TAG=1"
      if !CURRENT_WEIGHT! GTR !HIGHEST_SEMVER_WEIGHT! (
        set /a HIGHEST_SEMVER_WEIGHT=!CURRENT_WEIGHT!
        set /a HIGHEST_MAJOR=!CURRENT_MAJOR!
        set /a HIGHEST_MINOR=!CURRENT_MINOR!
        set /a HIGHEST_PATCH=!CURRENT_PATCH!
      )
    ) else (
      call :try_parse_integer "!CURRENT_TAG!"
      if not errorlevel 1 (
        set "HAS_INTEGER_TAG=1"
        if !CURRENT_INTEGER! GTR !HIGHEST_INTEGER_TAG! (
          set /a HIGHEST_INTEGER_TAG=!CURRENT_INTEGER!
        )
      )
    )
  )
)

if defined HAS_SEMVER_TAG (
  set /a NEXT_PATCH=HIGHEST_PATCH + 1
  set "IMAGE_TAG=v!HIGHEST_MAJOR!.!HIGHEST_MINOR!.!NEXT_PATCH!"
  echo [INFO] Auto-incremented semantic version tag to !IMAGE_TAG!
  exit /b 0
)

if defined HAS_INTEGER_TAG (
  set /a NEXT_INTEGER=HIGHEST_INTEGER_TAG + 1
  set "IMAGE_TAG=!NEXT_INTEGER!"
  echo [INFO] Auto-incremented numeric tag to !IMAGE_TAG!
  exit /b 0
)

set "IMAGE_TAG=v1.0.0"
echo [INFO] No existing mailler-backend tags found. Starting at !IMAGE_TAG!.
exit /b 0

:try_parse_semver
set "TAG_VALUE=%~1"
set "SEMVER_MAJOR="
set "SEMVER_MINOR="
set "SEMVER_PATCH="
set "SEMVER_EXTRA="
if /i "!TAG_VALUE:~0,1!"=="v" set "TAG_VALUE=!TAG_VALUE:~1!"

for /f "tokens=1,2,3,4 delims=." %%A in ("!TAG_VALUE!") do (
  set "SEMVER_MAJOR=%%~A"
  set "SEMVER_MINOR=%%~B"
  set "SEMVER_PATCH=%%~C"
  set "SEMVER_EXTRA=%%~D"
)

if not defined SEMVER_MAJOR exit /b 1
if not defined SEMVER_MINOR exit /b 1
if not defined SEMVER_PATCH exit /b 1
if defined SEMVER_EXTRA exit /b 1

for /f "delims=0123456789" %%A in ("!SEMVER_MAJOR!!SEMVER_MINOR!!SEMVER_PATCH!") do exit /b 1

set /a CURRENT_MAJOR=SEMVER_MAJOR
set /a CURRENT_MINOR=SEMVER_MINOR
set /a CURRENT_PATCH=SEMVER_PATCH
set /a CURRENT_WEIGHT=(CURRENT_MAJOR * 1000000) + (CURRENT_MINOR * 1000) + CURRENT_PATCH
exit /b 0

:try_parse_integer
set "TAG_VALUE=%~1"
set "CURRENT_INTEGER="
if not defined TAG_VALUE exit /b 1
for /f "delims=0123456789" %%A in ("!TAG_VALUE!") do exit /b 1
set /a CURRENT_INTEGER=TAG_VALUE
exit /b 0
