import torch
from logger import get_logger

logger = get_logger("device")

def get_device() -> torch.device:
    """Detects and returns the best available PyTorch device (CUDA, MPS, or CPU)."""
    if torch.cuda.is_available():
        device_name = "cuda"
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        device_name = "mps"
    else:
        device_name = "cpu"
    
    device = torch.device(device_name)
    logger.info(f"Using PyTorch device: {device}")
    return device
