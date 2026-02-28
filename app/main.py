## This is the main application file for the URL shortener service. It sets up the FastAPI app, includes routers, and defines middleware and exception handlers.
import logging
import time
# FastAPI imports
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
# Rate limiting imports
from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded
# Local imports
from app.database import engine
from app.routers import url
from app.rate_limiter import limiter
from app import models

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Initialize logging
logging.basicConfig(level=logging.INFO)

# Initialize FastAPI app
app = FastAPI()
app.include_router(url.router)

# Set up rate limiter

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)


# Logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    logging.info(
        f"{request.method}: {request.url.path} "
        f"Status: {response.status_code} "
        f"Duration: {duration:.4f}s"
    )
    
    return response

# Exception handlers #

# Request validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
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