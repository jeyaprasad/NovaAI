import torch
import time
from PIL import Image
from typing import Dict, Any
from backend.vision.remoteclip import remoteclip_service
from backend.vision.preprocessing import preprocess_image
from backend.utils.logger import logger

from backend.vision.labels import ZERO_SHOT_LABELS

CANDIDATE_TAGS = ZERO_SHOT_LABELS

def run_mock_inference(image: Image.Image) -> Dict[str, Any]:
    """
    Mock inference using simple color analysis.
    Avoids downloading 1.7 GB checkpoint during development/testing.
    """
    # Resize to speed up pixel analysis
    img_small = image.resize((50, 50)).convert("RGB")
    pixels = list(img_small.getdata())
    
    # Simple color classification
    green_count = 0
    blue_count = 0
    yellow_count = 0 # sand/desert/barren/agriculture
    urban_count = 0  # gray/industrial/residential
    
    for r, g, b in pixels:
        # Greenish (Forest / Vegetation)
        if g > r * 1.1 and g > b * 1.1:
            green_count += 1
        # Blueish (Water)
        elif b > r * 1.1 and b > g * 1.1:
            blue_count += 1
        # Yellowish / Sandy (Desert / Agriculture / Barren)
        elif r > 150 and g > 130 and b < 100:
            yellow_count += 1
        # Grayish / Dark (Urban / Industrial / Residential)
        elif abs(r - g) < 20 and abs(g - b) < 20 and abs(r - b) < 20:
            urban_count += 1

    # Default baseline scores (cos_sim sum must be positive, probabilities sum to 1.0)
    # Tags: Forest, Agriculture, Residential, Industrial, Water, Desert
    cos_scores = [0.08, 0.07, 0.06, 0.05, 0.05, 0.04]
    
    # Adjust scores based on dominant counts
    total_pixels = len(pixels)
    if green_count > blue_count and green_count > yellow_count and green_count > urban_count:
        # Forest dominant
        cos_scores = [0.18, 0.08, 0.05, 0.04, 0.06, 0.03]
    elif blue_count > green_count and blue_count > yellow_count and blue_count > urban_count:
        # Water dominant
        cos_scores = [0.05, 0.04, 0.04, 0.03, 0.18, 0.04]
    elif yellow_count > green_count and yellow_count > blue_count and yellow_count > urban_count:
        # Desert/Agriculture dominant
        if green_count > 0.1 * total_pixels:
            # Agriculture
            cos_scores = [0.08, 0.18, 0.05, 0.04, 0.05, 0.08]
        else:
            # Desert
            cos_scores = [0.03, 0.07, 0.04, 0.03, 0.05, 0.18]
    elif urban_count > green_count and urban_count > blue_count and urban_count > yellow_count:
        # Urban/Industrial dominant
        cos_scores = [0.04, 0.05, 0.15, 0.16, 0.04, 0.03]
        
    # Softmax conversion
    import math
    scaled = [math.exp(score * 100.0) for score in cos_scores]
    sum_scaled = sum(scaled)
    probs = [s / sum_scaled for s in scaled]
    
    return {
        "embedding_shape": [1, 768],
        "embedding_sample_first_10": [0.1] * 10,
        "embeddings_stats": {
            "mean": 0.1,
            "std": 0.9,
            "l2_norm": 1.0
        },
        "zero_shot_inspection": [
            {
                "tag": CANDIDATE_TAGS[i],
                "cosine_similarity": cos_scores[i],
                "confidence_score": probs[i]
            }
            for i in range(len(CANDIDATE_TAGS))
        ],
        "performance": {
            "inference_time_ms": 5.0,
            "total_time_ms": 10.0
        }
    }

def run_remoteclip_inference(image: Image.Image) -> Dict[str, Any]:
    """
    Runs inference on the provided PIL image using RemoteCLIP.
    Computes visual feature embeddings, extracts stats, and runs zero-shot
    similarity scans against test remote sensing captions for verification.
    """
    # 1. Ensure model is loaded (or fallback to mock if checkpoint is missing)
    if remoteclip_service.model is None:
        if not remoteclip_service._checkpoint_valid():
            logger.warning("RemoteCLIP checkpoint not found or incomplete. Falling back to mock zero-shot inference.")
            return run_mock_inference(image)
        logger.info("RemoteCLIP model not loaded yet. Bootstrapping...")
        remoteclip_service.load_model()

    model = remoteclip_service.model
    preprocess = remoteclip_service.preprocess
    tokenizer = remoteclip_service.tokenizer
    device = remoteclip_service.device

    # 2. Preprocess image
    start_time = time.time()
    input_tensor = preprocess_image(image, preprocess).to(device)
    
    # 3. Model execution
    logger.info("Running RemoteCLIP visual encoder inference...")
    inference_start = time.time()
    with torch.no_grad():
        # Encode image features
        image_features = model.encode_image(input_tensor)
        
        # Calculate stats of raw embedding
        raw_mean = float(image_features.mean().cpu().item())
        raw_std = float(image_features.std().cpu().item())
        embedding_shape = list(image_features.shape)
        
        # L2 Normalize
        normalized_image_features = torch.nn.functional.normalize(image_features, dim=-1)
        
        # Encode text tags for zero-shot inspection
        text_tokens = tokenizer(CANDIDATE_TAGS).to(device)
        text_features = model.encode_text(text_tokens)
        normalized_text_features = torch.nn.functional.normalize(text_features, dim=-1)
        
        # Compute cosine similarities and soft probabilities
        # Shape: (5,)
        similarities = (normalized_image_features @ normalized_text_features.T).squeeze(0)
        
        # OpenCLIP uses a logit scale dynamically. Let's use standard cosine similarity
        cosine_scores = similarities.cpu().tolist()
        
        # Calculate soft probabilities (standard CLIP scaling factor of 100)
        probabilities = (similarities * 100.0).softmax(dim=-1).cpu().tolist()

    inference_time_ms = (time.time() - inference_start) * 1000
    total_time_ms = (time.time() - start_time) * 1000
    logger.info(f"RemoteCLIP inference completed in {inference_time_ms:.2f}ms. Total pipeline: {total_time_ms:.2f}ms.")

    # Convert embedding sample to standard python list (first 10 floats)
    embedding_sample = image_features.squeeze(0)[:10].cpu().tolist()

    return {
        "embedding_shape": embedding_shape,
        "embedding_sample_first_10": embedding_sample,
        "embeddings_stats": {
            "mean": raw_mean,
            "std": raw_std,
            "l2_norm": float(torch.norm(image_features, p=2).cpu().item())
        },
        "zero_shot_inspection": [
            {
                "tag": CANDIDATE_TAGS[i],
                "cosine_similarity": cosine_scores[i],
                "confidence_score": probabilities[i]
            }
            for i in range(len(CANDIDATE_TAGS))
        ],
        "performance": {
            "inference_time_ms": inference_time_ms,
            "total_time_ms": total_time_ms
        }
    }
