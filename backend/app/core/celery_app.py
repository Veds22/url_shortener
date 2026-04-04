from celery import Celery
import os

REDIS_URL = os.getenv("REDIS_URL")

celery_app = Celery(
    "worker",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=[
        "app.tasks.click_tasks",
        "app.tasks.expiry_tasks",
    ],
)

celery_app.conf.enable_utc = True
celery_app.conf.timezone = "UTC"
celery_app.conf.broker_connection_retry_on_startup = True

celery_app.conf.beat_schedule = {
    "sync-clicks-every-minute": {
        "task": "app.tasks.click_tasks.sync_all_clicks",
        "schedule": 60.0,  # every 60 seconds
    }
}

celery_app.conf.beat_schedule.update({
    "expire-links-every-day": {
        "task": "app.tasks.expiry_tasks.expiry_short_links",
        "schedule": 600.0,  # every 10 minutes
    }
})

import app.tasks.click_tasks
import app.tasks.expiry_tasks