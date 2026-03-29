## This is the main application file for the URL shortener service. It sets up the FastAPI app, includes routers, and defines middleware and exception handlers.
# FastAPI imports
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware
# Rate limiting imports
from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded
# Local imports
from app.database import engine
from app.routers import url, auth
from app import models
from app.middleware.logging import LoggingMiddleware
from app.middleware.rate_limiter import limiter
from app.core.init_admin import create_admin

# Create database tables
models.Base.metadata.create_all(bind=engine)
@app.on_event("startup")
def startup_event():
    """Run startup tasks such as creating the default admin user."""
    create_admin()

# Initialize FastAPI app
app = FastAPI()
app.include_router(url.router)
app.include_router(auth.router, prefix="/auth")  # Auth routes under /auth

# Set up rate limiter

app.state.limiter = limiter

#adding Middleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(LoggingMiddleware)
app.add_middleware(SlowAPIMiddleware)

# Exception handlers #

# Request validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return a standardized JSON error response for validation failures."""
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": {
                "code": 422,
                "message": "Validation error",
                "details": exc.errors()
            }
        }
    )
    
# Rate limit exceeded
@app.exception_handler(RateLimitExceeded)
async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Return a JSON error response when a client exceeds the global rate limit."""
    return JSONResponse(
        status_code=429,
        content={
            "success": False,
            "error": {
                "code": 429,
                "message": "Rate limit exceeded. Please try again later."
            }
        }
    )    

# Other HTTP exceptions
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Wrap Starlette HTTP exceptions in the unified error response format."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.status_code,
                "message": exc.detail
            }   
        }
    )