from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
import time

GREEN = "\033[32m"
CYAN = "\033[36m"
YELLOW = "\033[33m"
BOLD_RED = "\033[1;31m"
RESET = "\033[0m"

def _status_color(code: int) -> str:
    if code < 300:
        return GREEN
    if code < 400:
        return CYAN
    if code < 500:
        return YELLOW
    return BOLD_RED

def get_logger(name: str):
    import logging
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    logger.propagate = False
    if not logger.handlers:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        formatter = logging.Formatter(
            "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
        )
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

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