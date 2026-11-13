from fastapi import APIRouter

from app.care_paths import service
from app.care_paths.schemas import CarePath, CarePathOptions, ComposeRequest

router = APIRouter(prefix="/care-paths", tags=["care-paths"])


@router.get("/options", response_model=CarePathOptions, operation_id="listCarePathOptions")
def list_options() -> CarePathOptions:
    """Every urgency lane, access route, communication profile and barrier, in display order."""
    return service.list_options()


@router.post("/compose", response_model=CarePath, operation_id="composeCarePath")
def compose(request: ComposeRequest) -> CarePath:
    """Compose one person's path. Unknown codes return 422."""
    return service.compose(request)
