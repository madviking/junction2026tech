# Aiven Runtime builds from a repository file and cannot run an image directly,
# so this only wraps the image CI builds with `encore build docker` and pushes
# to GHCR (.github/workflows/readiness.yml, job `image`). See docs/deployment.md.
FROM ghcr.io/madviking/silta-api:main
EXPOSE 8080
