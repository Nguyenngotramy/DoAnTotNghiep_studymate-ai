"""BYOK provider and model configuration for StudyMind AI."""

from __future__ import annotations

from typing import Literal

from anthropic import AsyncAnthropic
from openai import AsyncOpenAI
from pydantic import BaseModel, Field
from llm_capacity import llm_capacity_slot
from llm_runtime import LLM_MAX_RETRIES


ProviderName = Literal["openrouter", "anthropic"]

PROVIDER_MODELS = {
    "openrouter": [
        {"id": "openai/gpt-oss-120b", "name": "GPT OSS 120B", "tier": "paid"},
        {"id": "deepseek/deepseek-v4-flash", "name": "DeepSeek V4 Flash", "tier": "paid"},
        {"id": "meta-llama/llama-3.3-70b-instruct", "name": "Llama 3.3 70B", "tier": "paid"},
        {"id": "qwen/qwen3.7-plus", "name": "Qwen 3.7 Plus", "tier": "paid"},
        {"id": "openrouter/free", "name": "OpenRouter Free Router", "tier": "free"},
    ],
    "anthropic": [
        {"id": "claude-haiku-4-5", "name": "Claude Haiku 4.5", "tier": "paid"},
        {"id": "claude-sonnet-4-5", "name": "Claude Sonnet 4.5", "tier": "paid"},
        {"id": "claude-opus-4-1", "name": "Claude Opus 4.1", "tier": "paid"},
    ],
}

DEFAULT_MODELS = {
    "openrouter": "openai/gpt-oss-120b",
    "anthropic": "claude-haiku-4-5",
}


class AiProviderFields(BaseModel):
    provider: ProviderName = "openrouter"
    model: str | None = Field(default=None, max_length=160)
    api_key: str | None = Field(default=None, max_length=512)


class ProviderValidationRequest(AiProviderFields):
    api_key: str = Field(min_length=8, max_length=512)


def validate_model(provider: str, model: str | None) -> str:
    normalized_provider = (provider or "openrouter").strip().lower()
    if normalized_provider not in PROVIDER_MODELS:
        raise ValueError("Nha cung cap AI khong duoc ho tro.")
    selected = (model or DEFAULT_MODELS[normalized_provider]).strip()
    allowed = {item["id"] for item in PROVIDER_MODELS[normalized_provider]}
    if selected not in allowed:
        raise ValueError("Model khong hop le voi nha cung cap da chon.")
    return selected


def build_ai_context(
    provider: str = "openrouter",
    model: str | None = None,
    api_key: str | None = None,
    extra: dict | None = None,
) -> dict:
    context = dict(extra or {})
    context["provider"] = provider
    context["model"] = validate_model(provider, model)
    if api_key and api_key.strip():
        context["api_key"] = api_key.strip()
    return context


async def validate_provider_key(provider: str, model: str, api_key: str) -> None:
    if provider == "anthropic":
        client = AsyncAnthropic(
            api_key=api_key,
            timeout=20.0,
            max_retries=LLM_MAX_RETRIES,
        )
        async with llm_capacity_slot({"api_key": api_key}):
            await client.messages.create(
                model=model,
                max_tokens=1,
                messages=[{"role": "user", "content": "Hi"}],
            )
        return

    client = AsyncOpenAI(
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1",
        timeout=20.0,
        max_retries=LLM_MAX_RETRIES,
    )
    async with llm_capacity_slot({"api_key": api_key}):
        await client.chat.completions.create(
            model=model,
            max_tokens=1,
            messages=[{"role": "user", "content": "Hi"}],
        )
