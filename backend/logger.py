import logging
import time
import os
import psutil
import torch
from typing import Callable, Any

# Configure root logging format
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)

def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)

logger = get_logger("system")

def get_memory_usage() -> str:
    """Returns a string describing current system and GPU memory usage."""
    process = psutil.Process(os.getpid())
    ram_mb = process.memory_info().rss / (1024 * 1024)
    gpu_str = ""
    if torch.cuda.is_available():
        gpu_allocated = torch.cuda.memory_allocated() / (1024 * 1024)
        gpu_cached = torch.cuda.memory_reserved() / (1024 * 1024)
        gpu_str = f" | GPU Allocated: {gpu_allocated:.1f}MB, Cached: {gpu_cached:.1f}MB"
    return f"RAM: {ram_mb:.1f}MB{gpu_str}"

def log_timing(func: Callable[..., Any]) -> Callable[..., Any]:
    """Decorator to measure and log the execution time of functions."""
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        start_time = time.time()
        logger.info(f"Starting {func.__name__} | Memory: {get_memory_usage()}")
        result = func(*args, **kwargs)
        duration = time.time() - start_time
        logger.info(f"Finished {func.__name__} in {duration:.4f}s | Memory: {get_memory_usage()}")
        return result
    return wrapper
