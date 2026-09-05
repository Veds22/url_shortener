from celery import Celery
import os

REDIS_URL = os.getenv("REDIS_URL")

celery_app = Celery(
    "worker",
    broker=REDIS_URL,
    backend=None,
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
        "schedule": 3600.0,  # every 1 hour
    }
}

celery_app.conf.beat_schedule.update({
    "expire-links-every-day": {
        "task": "app.tasks.expiry_tasks.expiry_short_links",
        "schedule": 3600.0,  # every 1 hour
    }
})

celery_app.conf.beat_schedule.update({
    "enrich-click-events": {
        "task": "app.tasks.click_tasks.enrich_click_events",
        # Aligned with the other hourly jobs (sync-clicks, expire-links) —
        # keeps all "how fresh is this data" answers consistent as
        # "up to an hour behind", one story instead of two.
        "schedule": 3600.0,  # every 1 hour
    }
})

import app.tasks.click_tasks
import app.tasks.expiry_tasks