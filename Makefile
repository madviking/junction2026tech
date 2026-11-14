.DEFAULT_GOAL := help
SHELL := /bin/bash
IMAGE ?= silta-api:dev
# The Encore installer puts the CLI here without touching PATH.
export PATH := $(HOME)/.encore/bin:$(PATH)

help: ## List targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'

env: ## Create .env from .env.example if missing
	@test -f .env || (cp .env.example .env && echo "created .env; add the Aiven and provider values")

secrets: env ## Write backend/.secrets.local.cue from .env (values never printed)
	python3 scripts/local_secrets.py

setup: env secrets ## Install dependencies and local secrets
	cd backend && npm ci
	cd frontend && npm ci

dev-backend: ## Run the Encore app with its local Postgres (:8300, dashboard :9400)
	cd backend && SILTA_FEATURE_JOURNEY_EDITOR=$${SILTA_FEATURE_JOURNEY_EDITOR:-true} encore run --port $${BACKEND_PORT:-8300}

dev-frontend: ## Run the frontend dev server on the host (:5300)
	cd frontend && VITE_FEATURE_JOURNEY_EDITOR=$${VITE_FEATURE_JOURNEY_EDITOR:-true} npm run dev

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

migrate-aiven: ## Apply pending migrations to Aiven (the image does not migrate)
	python3 scripts/aiven.py migrate

run-image: ## Run the image locally against Aiven (:8300), secrets from .env
	python3 scripts/aiven.py run $(IMAGE)

.PHONY: help env secrets setup dev-backend dev-frontend api test lint ready image migrate-aiven run-image
