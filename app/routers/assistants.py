from fastapi import APIRouter
from .assistants.assistant_routes import router as routes_router
from .assistants.assistant_io import router as io_router
from .assistants.assistant_manager import router as manager_router
from .assistants.assistant_features import router as features_router

router = APIRouter(prefix="/assistants", tags=["assistants"])

router.include_router(routes_router)
router.include_router(io_router)
router.include_router(manager_router)
router.include_router(features_router)