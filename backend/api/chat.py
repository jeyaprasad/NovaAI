from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, Any, List
import time
import asyncio

from backend.llm.openrouter import OpenRouterClient
from backend.llm.gpt_service import GPTService
from backend.config.settings import settings
from backend.utils.logger import logger

router = APIRouter(prefix="/api/chat", tags=["Chat"])

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    model: str
    provider: str
    usage: Dict[str, Any] = {}

class ChatStreamRequest(BaseModel):
    question: str
    result: Dict[str, Any]
    history: List[Dict[str, Any]]

# Dependency injection can be expanded later
provider = OpenRouterClient()
gpt_service = GPTService(provider)

@router.post("/stream")
async def stream_chat(request: ChatStreamRequest):
    logger.info(f"Received request on /api/chat/stream. Question: '{request.question}'")

    async def event_generator():
        # Check if LLM API key is valid
        api_key = settings.OPENROUTER_API_KEY
        if api_key and api_key != "your_api_key_here":
            try:
                # Build context-grounded system and user messages
                messages = [
                    {"role": "system", "content": f"You are Nova AI, a helpful intelligent assistant specialized in Earth Observation (EO) and Remote Sensing. You have access to the following satellite analysis result: {request.result}. Answer the user's question concisely, grounded in this context."},
                ]
                for h in request.history:
                    role = "assistant" if h.get("role") == "assistant" else "user"
                    messages.append({"role": role, "content": h.get("text", "")})
                
                messages.append({"role": "user", "content": request.question})

                response = await provider.client.chat.completions.create(
                    model=settings.MODEL_NAME,
                    messages=messages,
                    stream=True
                )
                async for chunk in response:
                    if chunk.choices and chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
                return
            except Exception as e:
                logger.warning(f"Failed to stream from OpenRouter client: {e}. Falling back to rule-based response generator.")

        # Fallback rule-based generator
        question_lower = request.question.lower()
        dominant = (request.result.get("dominant_land_cover") or "unknown").lower()
        confidence = request.result.get("confidence") or "High"
        summary = request.result.get("summary") or ""
        ndvi = request.result.get("estimated_ndvi") or 0.45
        sensor = request.result.get("sensor_type") or "Sentinel-2 MSI"
        resolution = request.result.get("spatial_resolution") or "10m / Pixel"
        classes = request.result.get("classes") or []

        # Decision Support Scorecard mapping
        veg_score, urb_score, ind_score, env_score, dev_level = 50, 50, 50, 50, "Medium"
        if "forest" in dominant:
            veg_score, urb_score, ind_score, env_score, dev_level = 92, 8, 2, 94, "Low"
        elif "agricult" in dominant:
            veg_score, urb_score, ind_score, env_score, dev_level = 76, 18, 4, 68, "Medium"
        elif "resid" in dominant:
            veg_score, urb_score, ind_score, env_score, dev_level = 32, 88, 12, 48, "High"
        elif "indust" in dominant:
            veg_score, urb_score, ind_score, env_score, dev_level = 12, 65, 82, 25, "Medium"
        elif "water" in dominant:
            veg_score, urb_score, ind_score, env_score, dev_level = 15, 10, 5, 85, "Low"

        # Generate response text based on keywords
        response_text = ""
        if "ndvi" in question_lower or "vegetation index" in question_lower:
            response_text = (
                f"Based on the Sentinel-2 multispectral band analysis of this scene, the estimated **Normalized Difference Vegetation Index (NDVI)** is **{ndvi}**.\n\n"
                f"An NDVI value of **{ndvi}** indicates:\n"
                f"- High chlorophyll presence and closed-canopy vegetation if > 0.70 (typical of Forest areas).\n"
                f"- Moderate growth and managed crops if between 0.30 and 0.60 (typical of Agricultural Farmlands).\n"
                f"- Sparse vegetation and low absorption signatures if between 0.10 and 0.30 (typical of Residential built-up).\n"
                f"- Near-zero or negative values if < 0.10, indicating water, bare rock, or impervious surfaces.\n\n"
                f"For academic studies, this index is calculated using Near-Infrared (NIR) and Red spectral bands: NDVI = (NIR - Red) / (NIR + Red)."
            )
        elif "picture" in question_lower or "image" in question_lower or "represent" in question_lower or "cover" in question_lower or "detect" in question_lower:
            class_lines = "\n".join([f"- **{c.get('label')}**: {c.get('pct')}%" for c in classes])
            response_text = (
                f"The primary land cover classified in this satellite image is **{dominant.capitalize()}** (Confidence: **{confidence}**).\n\n"
                f"**Land Cover Breakdown:**\n{class_lines}\n\n"
                f"**Ecosystem Summary:** {summary}"
            )
        elif "risk" in question_lower or "threat" in question_lower or "concern" in question_lower or "pollut" in question_lower:
            risk_text = "No immediate major threats detected; ecosystem parameters are stable."
            if "forest" in dominant:
                risk_text = "Wildfire vulnerability during seasonal dry spells and forest fragmentation due to agricultural boundary encroachment."
            elif "agricult" in dominant:
                risk_text = "Soil nutrient depletion from crop monoculture, high water usage, and fertilizer runoff leading to downstream eutrophication risks."
            elif "resid" in dominant:
                risk_text = "Urban Heat Island (UHI) thermal stress and severe storm water runoff risks due to high concrete/asphalt soil sealing."
            elif "indust" in dominant:
                risk_text = "Elevated point-source chemical pollution potential, heavy metal runoff, and negligible soil drainage capacity."
            elif "water" in dominant:
                risk_text = "Vulnerability to organic loading and nutrient enrichment (eutrophication) if agricultural lands surround the catchment."
            
            response_text = (
                f"Analyzing environmental stress factors for this **{dominant.capitalize()}** landscape:\n\n"
                f"- **Environmental Quality Score:** {env_score}/100\n"
                f"- **Urbanization Index:** {urb_score}/100\n"
                f"- **Primary Threat:** {risk_text}\n\n"
                f"We recommend deploying localized ground sensors or multi-temporal imagery to trace anomalies over time."
            )
        else:
            response_text = (
                f"Grounding my response in the Earth Observation telemetry for the detected **{dominant.capitalize()}** landscape:\n\n"
                f"- **Dominant Cover Type:** {dominant.capitalize()} (Confidence: {confidence})\n"
                f"- **Sensor Platform:** {sensor}\n"
                f"- **Spatial Resolution:** {resolution}\n"
                f"- **Estimated NDVI:** {ndvi}\n\n"
                f"Please let me know if you would like specific details about the vegetation indices, urbanization level, or environmental quality scores of this scene."
            )

        # Yield chunks with artificial typing delay to simulate real streaming
        words = response_text.split(" ")
        for i in range(0, len(words), 2):
            chunk = " ".join(words[i:i+2]) + " "
            yield chunk
            await asyncio.sleep(0.03)

    return StreamingResponse(event_generator(), media_type="text/plain")

@router.post("/test", response_model=ChatResponse)
async def test_chat(request: ChatRequest):
    logger.info("Received request on /api/chat/test")
    
    system_prompt = "You are Nova Ai, a helpful intelligent assistant."
    
    start_time = time.time()
    try:
        result = await gpt_service.generate_response(
            system_prompt=system_prompt,
            user_prompt=request.message
        )
        
        response_time = time.time() - start_time
        logger.info(f"Response received successfully in {response_time:.2f} seconds.")
        
        return ChatResponse(
            response=result["response"],
            model=result["model"],
            provider=result["provider"],
            usage=result.get("usage", {})
        )
        
    except ValueError as e:
        logger.error(f"Value Error: {str(e)}")
        if "API Key" in str(e):
            raise HTTPException(status_code=401, detail="API Key configuration error")
        if "MODEL_NAME" in str(e):
            raise HTTPException(status_code=500, detail="MODEL_NAME configuration error")
        raise HTTPException(status_code=500, detail="Internal configuration error")
    except Exception as e:
        response_time = time.time() - start_time
        logger.error(f"Error calling GPT service after {response_time:.2f} seconds: {str(e)}")
        # Check for OpenAI SDK exception types
        from openai import AuthenticationError, RateLimitError, APITimeoutError, APIStatusError, APIConnectionError
        if isinstance(e, AuthenticationError):
            raise HTTPException(status_code=401, detail="Authentication failed with LLM provider")
        if isinstance(e, APITimeoutError):
            raise HTTPException(status_code=504, detail="Timeout communicating with LLM provider")
        if isinstance(e, RateLimitError):
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        if isinstance(e, APIConnectionError):
            raise HTTPException(status_code=502, detail="Could not connect to LLM provider")
        if isinstance(e, APIStatusError):
            raise HTTPException(status_code=502, detail="Bad gateway or error from LLM provider")
            
        raise HTTPException(status_code=500, detail="Unexpected error occurred")
