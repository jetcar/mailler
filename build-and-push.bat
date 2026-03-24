@echo off
setlocal enabledelayedexpansion

REM Usage:
REM   build-and-push.bat <registry_or_namespace> [tag]
REM Example:
REM   build-and-push.bat mydockeruser v1.0.0

if "%~1"=="" (
  echo [ERROR] Missing required argument: registry_or_namespace
  echo.
  echo Usage: %~nx0 ^<registry_or_namespace^> [tag]
  echo Example: %~nx0 mydockeruser v1.0.0
  exit /b 1
)

set "REGISTRY_NAMESPACE=%~1"
set "IMAGE_TAG=%~2"
if "%IMAGE_TAG%"=="" set "IMAGE_TAG=latest"

set "BACKEND_IMAGE=%REGISTRY_NAMESPACE%/mailler-backend:%IMAGE_TAG%"

echo [INFO] Using registry/namespace: %REGISTRY_NAMESPACE%
echo [INFO] Using tag: %IMAGE_TAG%
echo [INFO] Backend image: %BACKEND_IMAGE%
echo.

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

echo [STEP] Building backend image...
docker build -f backend/Dockerfile -t "%BACKEND_IMAGE%" .
if errorlevel 1 (
  echo [ERROR] Backend image build failed.
  exit /b 1
)

echo [STEP] Pushing backend image...
docker push "%BACKEND_IMAGE%"
if errorlevel 1 (
  echo [ERROR] Backend image push failed.
  exit /b 1
)

echo.
echo [SUCCESS] Build and push completed.
echo [SUCCESS] %BACKEND_IMAGE%

endlocal
exit /b 0
