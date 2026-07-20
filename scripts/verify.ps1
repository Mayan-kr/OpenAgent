$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot\..\backend
uv run ruff check app tests
uv run black --check app tests
uv run pytest
Pop-Location
npm run lint
npm run format:check
npm run test
npm run build
