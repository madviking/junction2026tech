.DEFAULT_GOAL := help
SHELL := /bin/bash
IMAGE ?= silta-api:dev
MIGRATE_IMAGE := migrate/migrate:v4.19.1
# The Encore installer puts the CLI here without touching PATH.
export PATH := $(HOME)/.encore/bin:$(PATH)

help: ## List targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'

env: ## Create .env from .env.example if missing
	@test -f .env || (cp .env.example .env && echo "created .env; add the Aiven and provider values")

setup: env ## Install backend and frontend dependencies
	cd backend && npm ci
	cd frontend && npm ci

dev-backend: ## Run the Encore app with its local Postgres (:8300, dashboard :9400)
	cd backend && encore run --port $${BACKEND_PORT:-8300}

dev-frontend: ## Run the frontend dev server on the host (:5300)
	cd frontend && npm run dev

api: ## Regenerate the frontend API client from the Encore app
	cd backend && encore gen client --lang=typescript --env=local --output=../frontend/src/shared/api/client.ts

test: ## Run backend and frontend tests
	cd backend && encore test
	cd frontend && npm run test:run

lint: ## Typecheck the backend, lint the frontend
	cd backend && npm run typecheck
	cd frontend && npm run lint

ready: ## Full readiness gate
	bash dev_readiness_check.sh --all

image: ## Build the self-hosted Docker image against backend/infra.config.json
	cd backend && encore build docker --config infra.config.json $(IMAGE)

# AIVEN_SILTA_URL comes from .env and is passed by name, so its value is never echoed.
migrate-aiven: ## Apply pending migrations to Aiven (the image does not migrate)
	@set -a && . ./.env && set +a && test -n "$$AIVEN_SILTA_URL" || { echo "AIVEN_SILTA_URL is empty in .env" >&2; exit 1; } && \
	docker run --rm -e AIVEN_SILTA_URL -v "$$PWD/backend/db/migrations:/migrations:ro" --entrypoint sh $(MIGRATE_IMAGE) \
	  -c 'migrate -path /migrations -database "$$AIVEN_SILTA_URL" up'

run-image: ## Run the image locally against Aiven (:8300), env from .env
	docker run --rm --env-file .env -p 127.0.0.1:$${BACKEND_PORT:-8300}:8080 $(IMAGE)

.PHONY: help env setup dev-backend dev-frontend api test lint ready image migrate-aiven run-image
