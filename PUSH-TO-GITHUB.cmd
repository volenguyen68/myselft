@echo off
setlocal
cd /d "%~dp0"
git -c safe.directory="%CD%" push -u origin main
if errorlevel 1 (
  echo.
  echo Push failed. Please sign in to your GitHub account and try again.
) else (
  echo.
  echo Source pushed. Set GitHub repository Settings - Pages - Source to GitHub Actions.
)
pause
