from fastapi import APIRouter
from .assistant_routes import router as routes_router
from .assistant_io import router as io_router
from .assistant_manager import router as manager_router
from .assistant_features import router as features_router
from .defaults import router as defaults_router

router = APIRouter(prefix="/assistants")

# Mount routers in correct order - features first to prevent path conflicts
router.include_router(features_router)  # Features router first
router.include_router(defaults_router)  # Defaults router
router.include_router(routes_router)    # Then the rest
router.include_router(io_router)
router.include_router(manager_router)
