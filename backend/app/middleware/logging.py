from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
import time
import os
import logging
from logging.handlers import RotatingFileHandler
import copy

RESET    = "\033[0m"
GREY     = "\033[37m"
GREEN    = "\033[32m"
CYAN     = "\033[36m"
YELLOW   = "\033[33m"
RED      = "\033[31m"
BOLD_RED = "\033[1;31m"

LEVEL_COLORS = {
    logging.DEBUG:    CYAN,
    logging.INFO:     GREEN,
    logging.WARNING:  YELLOW,
    logging.ERROR:    RED,
    logging.CRITICAL: BOLD_RED,
}

LOG_DIR = "logs"
LOG_FILE = "app.log"
os.makedirs(LOG_DIR, exist_ok=True)
log_path = os.path.join(LOG_DIR, LOG_FILE)


class ColorFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        record_copy = copy.copy(record)
        
        color = LEVEL_COLORS.get(record_copy.levelno, RESET)
        record_copy.levelname = f"{color}{record_copy.levelname:<8}{RESET}"  # ← copy, not record
        record_copy.name = f"{GREY}{record_copy.name}{RESET}"                # ← copy, not record
       
        return super().format(record_copy)

def _status_color(code: int) -> str:
    if code < 300:
        return GREEN
    if code < 400:
        return CYAN
    if code < 500:
        return YELLOW
    return BOLD_RED
 

def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    logger.propagate = False

    if not logger.handlers:
        base_format = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"

        # File (without color coded)
        file_handler = RotatingFileHandler(
            log_path,
            maxBytes=5 * 1024 * 1024,
            backupCount=3
        )
        file_handler.setFormatter(logging.Formatter(base_format))

        # Console (color coded)
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(ColorFormatter(base_format))

        logger.addHandler(console_handler)
        logger.addHandler(file_handler)

    return logger

class LoggingMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.logger = get_logger("app.middleware.logging")

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        method = request.method
        path = request.url.path
        client_ip = request.client.host if request.client else "unknown"

        self.logger.info(f"-> {method} {path} | from {client_ip}")

        try:
            response = await call_next(request)
        except Exception as e:
            self.logger.error(f"Unhandled error: {str(e)}", exc_info=True)
            raise

        process_time = time.time() - start_time
        status = response.status_code
        colored_status = f"{_status_color(status)}{status}{RESET}"
        self.logger.info(f"<- {method} {path} | Status: {colored_status} | {process_time:.4f}s")

        return response