.DEFAULT_GOAL := help
SHELL := /bin/bash

help: ## List targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-14s %s\n", $$1, $$2}'

env: ## Create .env from .env.example if missing
	@test -f .env || (cp .env.example .env && echo "created .env; add your LLM keys")

setup: env ## Install backend and frontend dependencies
	cd backend && uv sync
	cd frontend && npm ci

up: env ## Start PostgreSQL + Redis and apply migrations
	docker compose up -d --wait postgres redis
	docker compose run --rm migrations

up-all: env ## Start data services plus backend and frontend containers
	docker compose --profile app up -d --build

down: ## Stop containers (keeps data volumes)
	docker compose --profile app down

migrate: ## Apply pending SQL migrations
	docker compose run --rm migrations

dev-backend: ## Run the backend on the host with reload (:8300)
	cd backend && uv run uvicorn app.main:app --reload --port $${BACKEND_PORT:-8300}

dev-frontend: ## Run the frontend dev server on the host (:5300)
	cd frontend && npm run dev

api: ## Regenerate contracts/openapi.json and frontend API types
	cd backend && uv run python scripts/export_openapi.py ../contracts/openapi.json
	cd frontend && npm run generate:api

test: ## Run backend and frontend unit tests
	cd backend && uv run pytest -q
	cd frontend && npm run test:run

lint: ## Lint backend and frontend
	cd backend && uv run ruff check . && uv run ruff format --check .
	cd frontend && npm run lint

ready: ## Full readiness gate
	bash dev_readiness_check.sh --all

llm-smoke: ## One tiny paid LLM call through app.llm (needs OPEN_ROUTER_API_KEY)
	cd backend && uv run python -m app.llm.cli smoke

.PHONY: help env setup up up-all down migrate dev-backend dev-frontend api test lint ready llm-smoke
