from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import logging
import time

from app.database import engine, get_db
from app import models, schemas
from app.utils import encode_base62
from app.routers import url

models.Base.metadata.create_all(bind=engine)

logging.basicConfig(level=logging.INFO)

app = FastAPI()
app.include_router(url.router)

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