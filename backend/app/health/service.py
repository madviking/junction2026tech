"""Health checks for the API and its data services."""

import logging

import psycopg
import redis

from app.config import get_settings
from app.core.db import connect
from app.health import repository
from app.health.schemas import DependencyCheck, HealthStatus

logger = logging.getLogger(__name__)


def _check_database() -> DependencyCheck:
    try:
        with connect() as conn:
            ok = repository.ping_database(conn)
    except psycopg.Error as exc:
        logger.warning("database health check failed: %s", exc.__class__.__name__)
        return DependencyCheck(name="postgres", state="unavailable", detail=exc.__class__.__name__)
    return DependencyCheck(name="postgres", state="ok" if ok else "unavailable")


def _check_redis() -> DependencyCheck:
    client = redis.Redis.from_url(get_settings().redis_url, socket_timeout=2, socket_connect_timeout=2)
    try:
        client.ping()
    except redis.RedisError as exc:
        logger.warning("redis health check failed: %s", exc.__class__.__name__)
        return DependencyCheck(name="redis", state="unavailable", detail=exc.__class__.__name__)
    finally:
        client.close()
    return DependencyCheck(name="redis", state="ok")


def get_health() -> HealthStatus:
    checks = [_check_database(), _check_redis()]
    status = "ok" if all(check.state == "ok" for check in checks) else "degraded"
    return HealthStatus(status=status, environment=get_settings().environment, checks=checks)
