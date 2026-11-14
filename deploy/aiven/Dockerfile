# Aiven Runtime builds from a repository file and cannot run an image directly,
# so this only wraps the image CI builds with `encore build docker` and pushes
# to GHCR (.github/workflows/readiness.yml, job `image`). See docs/deployment.md.
FROM ghcr.io/madviking/silta-api:main
# Journey editor API on in the deployed app (pairs with VITE_FEATURE_JOURNEY_EDITOR in
# frontend/Dockerfile). Writes still need an editor; the demo viewer only reads.
# Set SILTA_FEATURE_JOURNEY_EDITOR=false in the Runtime app's environment to turn it off.
ENV SILTA_FEATURE_JOURNEY_EDITOR=true
EXPOSE 8080
