## This is the main application file for the URL shortener service. It sets up the FastAPI app, includes routers, and defines middleware and exception handlers.
# FastAPI imports
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException, RequestValidationError
# Rate limiting imports
from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded
# Local imports
from app.database import engine
from app.routers import url
from app import models
from app.middleware.logging import LoggingMiddleware, get_logger
from app.middleware.rate_limiter import limiter



# Create database tables
models.Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI()
app.include_router(url.router)

# Setup logger
logger = get_logger("app.main")

# Set up rate limiter
app.state.limiter = limiter

#adding Middleware

app.add_middleware(LoggingMiddleware)
app.add_middleware(SlowAPIMiddleware)

# Exception handlers #

# Request validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(
        f"ValidationError | Path: {request.url.path} | Errors: {exc.errors()}"
    )

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
    logger.warning(
        f"RateLimitExceeded | Path: {request.url.path} | Client: {request.client.host if request.client else 'unknown'}"
    )
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
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.warning(
        f"HTTPException | Path: {request.url.path} | Status Code: {exc.status_code} | Message: {exc.detail}"
    )       
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