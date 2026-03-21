from celery import Celery
import os

REDIS_URL = os.getenv("REDIS_URL")

celery_app = Celery(
    "worker",
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery_app.autodiscover_tasks(["app.tasks"])

celery_app.conf.beat_schedule = {
    "sync-clicks-every-minute": {
        "task": "app.tasks.click_tasks.sync_all_clicks",
        "schedule": 60.0,  # every 60 seconds
    }
}

celery_app.conf.beat_schedule.update({
    "expire-links-every-day": {
        "task": "app.tasks.expiry_tasks.expiry_short_links",
        "schedule": 86400.0,  # every 24 hours
    }
})

import app.tasks.click_tasks
import app.tasks.expiry_tasks