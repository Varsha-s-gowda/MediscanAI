import multiprocessing
import os

bind = "0.0.0.0:5000"
workers = int(os.getenv("WEB_CONCURRENCY", "2"))
worker_class = "uvicorn.workers.UvicornWorker"
timeout = 120
keepalive = 5
loglevel = "info"
accesslog = "-"
errorlog = "-"
