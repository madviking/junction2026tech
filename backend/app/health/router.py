from fastapi import APIRouter

from app.health import service
from app.health.schemas import HealthStatus

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthStatus, operation_id="getHealth")
def get_health() -> HealthStatus:
    """Liveness plus dependency status. Always 200 so containers stay up while degraded."""
    return service.get_health()
