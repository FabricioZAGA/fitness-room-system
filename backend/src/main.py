"""Fitness Room System — FastAPI application entry point.

This module initializes the FastAPI app, registers all routers,
configures exception handlers, and exposes the Mangum Lambda handler.

Architecture:
  HTTP Request → API Gateway v2 → Lambda (Mangum)
              → FastAPI → Router → Service → Repository → DynamoDB
"""

from typing import Any

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.typing import LambdaContext
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from mangum import Mangum

from src.config import get_settings
from src.routers import (
    classes,
    health,
    instructors,
    inventory,
    memberships,
    reports,
    reservations,
    stats,
    students,
    transactions,
)
from src.utils.exceptions import (
    CapacityExceededException,
    FitnessRoomException,
    InvalidOperationException,
    MembershipExpiredException,
    MembershipNotFoundException,
    ResourceAlreadyExistsException,
    ResourceNotFoundException,
)

logger = Logger()
tracer = Tracer()

settings = get_settings()

app = FastAPI(
    title="Fitness Room API",
    description=(
        "Sistema de gestión integral para Fitness Room.\n\n"
        "## Módulos disponibles\n"
        "- **Alumnos** — Registro, perfil e historial\n"
        "- **Membresías** — Asignación, control y alertas\n"
        "- **Clases** — Calendario y gestión de sesiones\n"
        "- **Reservas** — Reservación, lista de espera y asistencia\n"
        "- **Transacciones** — Registro de pagos y corte de caja\n"
        "- **Inventario** — Productos y ventas\n"
        "- **Reportes** — Ingresos, asistencia y rankings\n\n"
        "## Autenticación\n"
        "Todos los endpoints (excepto `/health`) requieren un Bearer token de Cognito.\n"
        "Incluye el token en el header: `Authorization: Bearer <token>`"
    ),
    version="1.0.0",
    contact={
        "name": "FabricioZAGA",
        "url": "https://github.com/FabricioZAGA/fitness-room-system",
    },
    openapi_tags=[
        {"name": "Health", "description": "API health check"},
        {"name": "Students", "description": "Student management operations"},
        {"name": "Memberships", "description": "Membership assignment and control"},
        {"name": "Classes", "description": "Fitness class session management"},
        {"name": "Reservations", "description": "Class reservations and waitlist"},
        {"name": "Transactions", "description": "Payment recording and cash cuts (corte de caja)"},
        {"name": "Inventory", "description": "Product inventory and sales"},
        {"name": "Reports", "description": "Business intelligence — income, attendance, rankings"},
    ],
)

_cors_origins = (
    ["*"]
    if settings.is_local
    else [
        settings.frontend_url,
        "http://localhost:5173",
    ]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ResourceNotFoundException)
async def resource_not_found_handler(
    _request: Request, exc: ResourceNotFoundException
) -> JSONResponse:
    """Handle 404 domain exceptions."""
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": exc.message},
    )


@app.exception_handler(ResourceAlreadyExistsException)
async def resource_exists_handler(
    _request: Request, exc: ResourceAlreadyExistsException
) -> JSONResponse:
    """Handle 409 domain exceptions."""
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": exc.message},
    )


@app.exception_handler(CapacityExceededException)
async def capacity_exceeded_handler(
    _request: Request, exc: CapacityExceededException
) -> JSONResponse:
    """Handle class capacity exceeded exceptions."""
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": exc.message},
    )


@app.exception_handler(InvalidOperationException)
async def invalid_operation_handler(
    _request: Request, exc: InvalidOperationException
) -> JSONResponse:
    """Handle invalid operation exceptions."""
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": exc.message},
    )


@app.exception_handler(MembershipExpiredException)
@app.exception_handler(MembershipNotFoundException)
async def membership_error_handler(_request: Request, exc: FitnessRoomException) -> JSONResponse:
    """Handle membership-related domain exceptions."""
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": exc.message},
    )


app.include_router(health.router)
app.include_router(students.router, prefix="/api/v1")
app.include_router(memberships.router, prefix="/api/v1")
app.include_router(classes.router, prefix="/api/v1")
app.include_router(reservations.router, prefix="/api/v1")
app.include_router(instructors.router, prefix="/api/v1")
app.include_router(stats.router, prefix="/api/v1")
app.include_router(transactions.router, prefix="/api/v1")
app.include_router(inventory.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")


@logger.inject_lambda_context(log_event=True)
@tracer.capture_lambda_handler
def handler(event: dict[str, Any], context: LambdaContext) -> dict[str, Any]:
    """AWS Lambda entry point — wraps FastAPI via Mangum."""
    mangum_handler = Mangum(app, lifespan="off")
    return mangum_handler(event, context)  # type: ignore[arg-type]
