import os
import logging
from dotenv import load_dotenv
import requests
import aiohttp
from typing import Dict, List, Optional, Any
from datetime import datetime
import time
import json

logger = logging.getLogger(__name__)
load_dotenv()

class APIError(Exception):
    "Base class for API related errors"
    pass

class APIClientError(APIError):
    "Errors originating from client-side issues (e.g., bad request)"
    pass

class APIServerError(APIError):
    "Errors originating from server-side issues"
    pass

class APINetworkError(APIError):
    "Errors related to network connectivity"
    pass
    
class APIProcessingError(APIError):
    "Errors during processing of the API response"
    pass

class PerplexityAPI:
    BASE_URL = "https://api.perplexity.ai"

    def __init__(self):
        self.api_key = os.getenv("PERPLEXITY_API_KEY")
        if not self.api_key:
            raise ValueError("PERPLEXITY_API_KEY environment variable not set.")
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        # Rate limiting configuration
        self.requests_per_minute = 60
        self.request_timestamps = []
        
    def _check_rate_limit(self):
        """Implement basic rate limiting"""
        current_time = time.time()
        # Remove timestamps older than 1 minute
        self.request_timestamps = [ts for ts in self.request_timestamps 
                                 if current_time - ts < 60]
        
        if len(self.request_timestamps) >= self.requests_per_minute:
            sleep_time = 60 - (current_time - self.request_timestamps[0])
            if sleep_time > 0:
                time.sleep(sleep_time)
        
        self.request_timestamps.append(current_time)

    def _prepare_messages(self, query: str, previous_summary: Optional[str] = None, custom_system_prompt: Optional[str] = None) -> List[Dict]:
        """
        Prepare the messages array for the API call.
        The Perplexity API requires roles to alternate between user and assistant
        after any optional system messages.
        """
        # Define the default system content
        default_system_content = "You are a helpful assistant that summarizes recent information about the user\'s query. Focus on developments and news from the specified time period. Present the key findings clearly and concisely, citing sources. Please format your response using markdown for better readability. Use markdown formatting for headings, lists, links, emphasis, and any code snippets or tables. Include citations with proper markdown hyperlinks."

        # Use custom_system_prompt if provided and not empty, otherwise use default
        system_content_to_use = custom_system_prompt if custom_system_prompt else default_system_content

        messages = [
            {
                "role": "system",
                "content": system_content_to_use # Use the determined system content
            }
        ]
        
        # If we have a previous summary, we need to add a user message first,
        # then the assistant's previous summary, then the new user query
        if previous_summary:
            # Add a placeholder user message to maintain alternating roles
            messages.append({
                "role": "user",
                "content": "Please summarize information about the following topic."
            })
            
            # Add the previous assistant response
            messages.append({
                "role": "assistant",
                "content": previous_summary
            })
            
            # Add the new user query as a follow-up
            messages.append({
                "role": "user",
                "content": f"Now provide me with the latest updates on: {query}"
            })
        else:
            # Simple case: just add the user query
            messages.append({
                "role": "user",
                "content": query
            })
        
        return messages

    # Synchronous version for non-async functions
    def _make_request_sync(self, endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.BASE_URL}/{endpoint}"
        try:
            response = requests.post(url, headers=self.headers, json=payload)
            response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error during API request to {url}: {e}")
            if e.response is not None:
                logger.error(f"API Response Status: {e.response.status_code}")
                logger.error(f"API Response Body: {e.response.text}")
                # Re-raise specific error for status code if possible
                if 400 <= e.response.status_code < 500:
                     raise APIClientError(f"API request failed with status {e.response.status_code}: {e.response.text}")
                elif 500 <= e.response.status_code < 600:
                     raise APIServerError(f"API server error {e.response.status_code}: {e.response.text}")
            raise APINetworkError(f"Network error during API call: {e}")
        except Exception as e:
             logger.error(f"Unexpected error during API call: {e}")
             raise # Re-raise unexpected errors
    
    # Async version for async functions
    async def _make_request(self, endpoint: str, payload: Dict[str, Any], timeout_seconds: int = 60) -> Dict[str, Any]:
        url = f"{self.BASE_URL}/{endpoint}"
        try:
            # Use dynamic timeout
            timeout_config = aiohttp.ClientTimeout(total=timeout_seconds)
            
            async with aiohttp.ClientSession(timeout=timeout_config) as session:
                logger.debug(f"Making API request to {url} with timeout of {timeout_seconds} seconds")
                
                async with session.post(url, headers=self.headers, json=payload) as response:
                    if response.status >= 400:
                        error_text = await response.text()
                        logger.error(f"API Response Status: {response.status}")
                        logger.error(f"API Response Body: {error_text}")
                        
                        if 400 <= response.status < 500:
                            raise APIClientError(f"API request failed with status {response.status}: {error_text}")
                        elif 500 <= response.status < 600:
                            raise APIServerError(f"API server error {response.status}: {error_text}")
                    
                    return await response.json()
                    
        except aiohttp.ClientError as e:
            logger.error(f"Error during API request to {url}: {e}")
            raise APINetworkError(f"Network error during API call: {e}")
        except Exception as e:
            logger.error(f"Unexpected error during API call: {e}")
            raise # Re-raise unexpected errors

    async def search(
        self, 
        query: str, 
        model: str = "sonar-pro",
        recency_filter: str = "day",
        previous_summary: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.2,
        top_p: float = 0.9
    ) -> Dict:
        """
        Perform a search query using the Perplexity API.
        
        Args:
            query (str): The search query
            model (str): The model to use (sonar or sonar-pro)
            recency_filter (str): Time filter for results (hour, day, week, month)
            previous_summary (str, optional): Previous summary for context
            max_tokens (int): Maximum tokens in response
            temperature (float): Response randomness (0-2)
            top_p (float): Nucleus sampling threshold (0-1)
            
        Returns:
            Dict: API response containing summary and sources
            
        Raises:
            PerplexityAPIError: If the API call fails
        """
        try:
            self._check_rate_limit()
            
            logger.info(f"Searching for: {query} using model: {model}")
            
            payload = {
                "model": model,
                "messages": self._prepare_messages(query, previous_summary),
                "max_tokens": max_tokens,
                "temperature": temperature,
                "top_p": top_p,
                "search_recency_filter": recency_filter,
                "web_search_options": {
                    "search_context_size": "high"
                }
            }
            
            result = await self._make_request("chat/completions", payload)
            
            # Extract the summary and sources from the response
            summary = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            # Parse sources from the summary (assuming they're in markdown format)
            sources = []
            if "Sources:" in summary:
                sources_text = summary.split("Sources:")[1].strip()
                sources = [s.strip() for s in sources_text.split("\n") if s.strip()]
            
            return {
                "query": query,
                "timestamp": datetime.utcnow().isoformat(),
                "summary": summary,
                "sources": sources,
                "model": model,
                "recency_filter": recency_filter
            }
            
        except APIError as e:
            logger.error(f"Perplexity API Error: {e}")
            raise # Re-raise specific API errors
        except Exception as e:
            error_msg = f"Unexpected error during API call: {str(e)}"
            logger.error(error_msg)
            raise APIProcessingError(error_msg)

    async def search_perplexity(self,
                          query: Optional[str],
                          model: str = "sonar",
                          recency_filter: str = "1d",
                          max_tokens: int = 512,
                          temperature: float = 0.7,
                          previous_summary: Optional[str] = None,
                          detail_level: str = "detailed",
                          messages_override: Optional[List[Dict[str, Any]]] = None,
                          custom_system_prompt: Optional[str] = None
                          ) -> Dict[str, Any]:
                          
        # Map internal recency filter format to Perplexity API format
        recency_map = {
            '1h': 'hour',
            '1d': 'day',
            '1w': 'week',
            '1m': 'month',
            '1y': 'year',
            'all_time': None  # No filter for all time
        }
        api_recency_filter = recency_map.get(recency_filter, 'day') # Default to 'day'
        if api_recency_filter is None and recency_filter == 'all_time':
             # For "all_time", we might need to omit the parameter or handle it as per API spec
             # For now, let's assume omitting it is fine or the API handles `None` gracefully.
             pass 

        # Separate mappings for reasoning and non-reasoning models' max_tokens
        detail_map_context = {
            "brief": {"search_context_size": "low"},
            "detailed": {"search_context_size": "medium"},
            "comprehensive": {"search_context_size": "high"},
        }

        detail_map_max_tokens = {
            # Max tokens for non-reasoning models
            "non_reasoning": {
                "brief": 512,
                "detailed": 850,
                "comprehensive": 1200,
            },
            # Max tokens for reasoning models (to account for thinking tokens)
            "reasoning": {
                "brief": 2500,
                "detailed": 5000,
                "comprehensive": 8000,
            },
        }

        # Get detail_level configurations
        # Use the lowercase detail_level directly for lookup
        detail_level_context_config = detail_map_context.get(detail_level, detail_map_context["detailed"])

        # Determine if the model is a reasoning model (include r1-1776)
        is_reasoning_model = model in ["sonar-reasoning", "sonar-reasoning-pro", "sonar-deep-research", "r1-1776"]

        # Get the correct max_tokens mapping based on model type
        max_tokens_mapping = detail_map_max_tokens["reasoning"] if is_reasoning_model else detail_map_max_tokens["non_reasoning"]

        # Get the effective max_tokens based on detail level and model type
        # Use the lowercase detail_level directly for lookup
        effective_max_tokens = max_tokens_mapping.get(detail_level, max_tokens_mapping["detailed"])

        # Get the effective search_context_size based on detail level
        effective_search_context_size = detail_level_context_config["search_context_size"]

        # Add debug logging to show determined parameters
        logger.debug(f"Determined API parameters for detail_level '{detail_level}' and model '{model}': max_tokens={effective_max_tokens}, search_context_size='{effective_search_context_size}'")

        # Determine timeout based on model (keeping previous logic for deep-research)
        current_timeout_seconds = 120 # Default to 120 seconds
        if model == "sonar-deep-research":
            current_timeout_seconds = 2400 # 40 minutes for deep research
            logger.info(f"Using extended timeout for sonar-deep-research: {current_timeout_seconds}s")

        if messages_override is not None:
            processed_messages = messages_override
        elif query is not None:
            # Pass custom_system_prompt to _prepare_messages
            processed_messages = self._prepare_messages(query, previous_summary, custom_system_prompt=custom_system_prompt)
        else:
            raise ValueError("Either 'query' or 'messages_override' must be provided to search_perplexity.")

        payload = {
            "model": model,
            "messages": processed_messages,
            "max_tokens": effective_max_tokens,
            "temperature": temperature,
        }
        
        # Only add web search options for non-R1 models
        # R1-1776 is an offline model and shouldn't use web search
        if model != "r1-1776":
            logger.info(f"Using model {model} with web search enabled")
            payload["web_search_options"] = {
                # Use effective_search_context_size based on detail level
                "search_context_size": effective_search_context_size 
            }
        else:
            logger.info(f"Using R1-1776 offline model - web search DISABLED")

        # Only add recency filter if it has a value, to handle "all_time"
        if api_recency_filter:
            payload["search_recency_filter"] = api_recency_filter

        logger.debug(f"Payload for search_perplexity: {json.dumps(payload, indent=2)}")

        try:
            self._check_rate_limit() # Check rate limit before making the call
            result = await self._make_request("chat/completions", payload, timeout_seconds=current_timeout_seconds)
            logger.debug(f"Received API response: {json.dumps(result)[:200]}...")
            
            # Extract relevant parts
            if result and result.get('choices') and len(result['choices']) > 0:
                choice = result['choices'][0]
                message = choice.get('message', {})
                content = message.get('content', '')
                logger.debug(f"Extracted content from API response, length: {len(content)}")
                
                # Check for no new information patterns
                no_new_info_patterns = [
                    "no new information",
                    "no additional information",
                    "no recent updates",
                    "no further information",
                    "no significant updates",
                    "information remains the same",
                    "no notable changes"
                ]
                
                has_no_new_info = any(pattern in content.lower() for pattern in no_new_info_patterns)
                
                if has_no_new_info:
                    logger.info("Detected 'no new information' in response")
                    content = "No new information is available since the last update."
                
                # Attempt to extract citations from API response if available
                raw_citations = result.get("citations") or choice.get("citations")
                sources_list = []
                if isinstance(raw_citations, list) and raw_citations:
                    for cit in raw_citations:
                        if isinstance(cit, dict):
                            url = cit.get("url") or cit.get("source") or str(cit)
                        else:
                            url = str(cit)
                        sources_list.append(url)
                    logger.debug(f"Extracted {len(sources_list)} sources from API citations")
                else:
                    sources_list = self._extract_sources_from_content(content)
                    logger.debug(f"Extracted {len(sources_list)} sources from markdown content")
                
                # For R1-1776 model, always return empty sources list since it's an offline model
                if model == "r1-1776":
                    logger.info(f"Using R1-1776 offline model - returning empty sources list (original had {len(sources_list)} sources)")
                    # Force empty sources list for R1-1776
                    sources_list = []
                    logger.info("Sources list cleared for R1-1776 model")
                
                # Return detailed response with list of sources
                return {
                    "answer": content,
                    "sources": sources_list,
                    "model": model,
                    "query": query,
                    "recency_filter": recency_filter,
                    "timestamp": datetime.utcnow().isoformat()
                }
            else:
                logger.warning(f"Unexpected API response structure: {result}")
                return {"answer": "", "sources": json.dumps([])}
                 
        except APIError as e:
            logger.error(f"Perplexity API Error: {e}")
            raise # Re-raise specific API errors
        except Exception as e:
            logger.error(f"Unexpected error during Perplexity API call: {e}", exc_info=True)
            raise APIProcessingError(f"Error processing Perplexity API response: {e}")

    def _extract_sources_from_content(self, content: str) -> List[str]:
        """Extract sources from markdown content"""
        sources = []
        
        # Try to find Sources section
        if "Sources:" in content:
            try:
                # Extract everything after "Sources:" heading
                sources_section = content.split("Sources:")[1].strip()
                
                # Extract URLs from markdown links [title](url)
                import re
                urls = re.findall(r'\[.*?\]\((https?://[^\s\)]+)\)', sources_section)
                
                if urls:
                    sources = urls
                    logger.debug(f"Extracted {len(sources)} sources using markdown link pattern")
                else:
                    # Fallback: try to extract raw URLs
                    raw_urls = re.findall(r'https?://[^\s\)\]]+', sources_section)
                    if raw_urls:
                        sources = raw_urls
                        logger.debug(f"Extracted {len(sources)} sources using raw URL pattern")
            except Exception as e:
                logger.warning(f"Failed to parse sources from content: {e}")
        
        # If no Sources section, try to find URLs throughout content
        if not sources:
            try:
                import re
                # Find all markdown links in the entire content
                urls = re.findall(r'\[.*?\]\((https?://[^\s\)]+)\)', content)
                if urls:
                    sources = urls
                    logger.debug(f"Extracted {len(sources)} sources from full content")
            except Exception as e:
                logger.warning(f"Failed to parse sources from full content: {e}")
                
        return sources

    async def ask_follow_up_question(
        self,
        query: str,
        context: str,
        model: str = "sonar-reasoning",
        max_tokens: int = 4000,
        temperature: float = 0.2,
        top_p: float = 0.9
    ) -> Dict[str, Any]:
        """
        Ask a follow-up question with context using the Perplexity API.
        
        Args:
            query (str): The follow-up question
            context (str): The context (previous summary)
            model (str): The model to use (sonar-reasoning is best for follow-up questions)
            max_tokens (int): Maximum tokens in response
            temperature (float): Response randomness (0-2)
            top_p (float): Nucleus sampling threshold (0-1)
            
        Returns:
            Dict: API response containing answer and sources
            
        Raises:
            PerplexityAPIError: If the API call fails
        """
        try:
            self._check_rate_limit()
            
            logger.info(f"Asking follow-up: {query} with model: {model}, max_tokens: {max_tokens}")
            
            payload = {
                "model": model,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are an AI assistant helping to explore a topic based on a previous summary. Format your response using markdown for better readability. Use markdown formatting for headings, lists, links, emphasis, and any code snippets or tables. Include citations with proper markdown hyperlinks."
                    },
                    {
                        "role": "user",
                        "content": f"{context}\\n\\nFollow-up question: {query}"
                    }
                ],
                "max_tokens": max_tokens,
                "temperature": temperature,
                "top_p": top_p,
                "web_search_options": {
                    "search_context_size": "high"
                }
            }
            
            result = await self._make_request("chat/completions", payload)
            
            if result and result.get('choices') and len(result['choices']) > 0:
                choice = result['choices'][0]
                message = choice.get('message', {})
                content = message.get('content', '')
                
                # Attempt to extract citations for follow-up if provided
                raw_citations = result.get("citations") or choice.get("citations") if (choice := result.get('choices', [{}])[0]) else None
                follow_sources = []
                if isinstance(raw_citations, list) and raw_citations:
                    for cit in raw_citations:
                        if isinstance(cit, dict):
                            url = cit.get("url") or cit.get("source") or str(cit)
                        else:
                            url = str(cit)
                        follow_sources.append(url)
                else:
                    follow_sources = self._extract_sources_from_content(content)
                
                logger.debug(f"Follow-up response successful. Content length: {len(content)}, sources: {len(follow_sources)}")
                
                return {
                    "answer": content,
                    "sources": follow_sources,
                    "model": model
                }
            else:
                 logger.warning(f"Unexpected API response structure for follow-up: {result}")
                 return {"answer": "", "sources": []}
                 
        except APIError as e:
             logger.error(f"Perplexity API Error on follow-up: {e}")
             raise
        except Exception as e:
            logger.error(f"Unexpected error during follow-up API call: {e}", exc_info=True)
            raise APIProcessingError(f"Error processing Perplexity follow-up response: {e}") 