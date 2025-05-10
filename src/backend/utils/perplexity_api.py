import os
import requests
from typing import Dict, List, Optional
from datetime import datetime

PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions"

def get_api_key() -> str:
    """Get the Perplexity API key from environment variables."""
    api_key = os.getenv("PERPLEXITY_API_KEY")
    if not api_key:
        raise ValueError("PERPLEXITY_API_KEY environment variable not set")
    return api_key

def get_max_tokens(detail_level: str) -> int:
    """Get the max tokens based on detail level."""
    return {
        "headline": 150,
        "short": 300,
        "detailed": 600
    }.get(detail_level, 300)

def get_search_context_size(detail_level: str) -> str:
    """Get the search context size based on detail level."""
    return "high" if detail_level == "detailed" else "medium"

def create_chat_completion(
    query: str,
    model: str = "sonar",
    detail_level: str = "short",
    recency_filter: str = "day"
) -> Dict:
    """
    Create a chat completion using the Perplexity API.
    
    Args:
        query: The user's query or topic
        model: The model to use (sonar or sonar-pro)
        detail_level: The level of detail (headline, short, detailed)
        recency_filter: The recency filter (hour, day, week)
    
    Returns:
        Dict containing the API response
    """
    headers = {
        "Authorization": f"Bearer {get_api_key()}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "You are a helpful assistant that summarizes recent information about the user's query. Focus on developments and news from the last time period. Present the key findings clearly and concisely, citing sources."
            },
            {
                "role": "user",
                "content": query
            }
        ],
        "search_recency_filter": recency_filter,
        "web_search_options": {
            "search_context_size": get_search_context_size(detail_level)
        },
        "max_tokens": get_max_tokens(detail_level),
        "temperature": 0.1,
        "top_p": 0.8,
        "top_k": 0
    }
    
    response = requests.post(PERPLEXITY_API_URL, headers=headers, json=payload)
    response.raise_for_status()
    
    return response.json()

def extract_summary_and_sources(response: Dict) -> tuple[str, List[str]]:
    """
    Extract the summary and sources from the API response.
    
    Args:
        response: The API response dictionary
    
    Returns:
        Tuple of (summary, sources)
    """
    # Note: This is a placeholder implementation. The actual response structure
    # will need to be adjusted based on the Perplexity API's actual response format
    summary = response.get("choices", [{}])[0].get("message", {}).get("content", "")
    sources = response.get("citations", [])
    
    return summary, sources 