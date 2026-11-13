from typing import Literal

from pydantic import BaseModel

CheckState = Literal["ok", "unavailable"]


class DependencyCheck(BaseModel):
    name: str
    state: CheckState
    detail: str | None = None


class HealthStatus(BaseModel):
    status: Literal["ok", "degraded"]
    environment: str
    checks: list[DependencyCheck]
