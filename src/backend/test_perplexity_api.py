import os
import pytest
from dotenv import load_dotenv
from unittest.mock import patch, MagicMock
from perplexity_api import PerplexityAPI, APIError

# Load environment variables
load_dotenv()

@pytest.fixture
def api():
    """Create a PerplexityAPI instance for testing"""
    return PerplexityAPI()

def test_api_initialization():
    """Test API initialization with and without API key"""
    # Test with valid API key
    api = PerplexityAPI()
    assert api.api_key is not None
    assert api.BASE_URL == "https://api.perplexity.ai"
    
    # Test without API key
    original_key = os.environ.get("PERPLEXITY_API_KEY")
    if "PERPLEXITY_API_KEY" in os.environ:
        del os.environ["PERPLEXITY_API_KEY"]
    
    with pytest.raises(ValueError):
        PerplexityAPI()
    
    # Restore API key
    if original_key:
        os.environ["PERPLEXITY_API_KEY"] = original_key

@patch('perplexity_api.requests.post')
def test_search_basic(mock_post, api):
    """Test basic search functionality with mocked response"""
    # Mock response data
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "choices": [{
            "message": {
                "content": "Mocked content about quantum computing"
            }
        }]
    }
    mock_post.return_value = mock_response
    
    query = "Latest developments in quantum computing"
    result = api.search(
        query=query,
        model="sonar-pro",
        recency_filter="week",
        max_tokens=500
    )
    
    assert isinstance(result, dict)
    assert "query" in result
    assert "timestamp" in result
    assert "summary" in result
    assert "sources" in result
    assert "model" in result
    assert "recency_filter" in result
    
    assert result["query"] == query
    assert result["model"] == "sonar-pro"
    assert result["recency_filter"] == "week"
    assert isinstance(result["sources"], list)

@patch('perplexity_api.requests.post')
def test_search_with_previous_summary(mock_post, api):
    """Test search with previous summary context using mocked response"""
    # Mock response data
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "choices": [{
            "message": {
                "content": "Mocked content with previous summary context"
            }
        }]
    }
    mock_post.return_value = mock_response
    
    query = "Latest developments in quantum computing"
    previous_summary = "Previous summary about quantum computing"
    
    result = api.search(
        query=query,
        model="sonar-pro",
        recency_filter="week",
        previous_summary=previous_summary
    )
    
    assert isinstance(result, dict)
    assert "summary" in result
    assert len(result["summary"]) > 0

def test_search_error_handling(api):
    """Test error handling for invalid requests"""
    # Test with invalid model
    with pytest.raises(APIError):
        api.search(
            query="test query",
            model="invalid-model"
        )
    
    # Test with invalid recency filter
    with pytest.raises(APIError):
        api.search(
            query="test query",
            recency_filter="invalid-filter"
        )

@patch('perplexity_api.requests.post')
def test_rate_limiting(mock_post, api):
    """Test rate limiting functionality with mocked responses"""
    # Mock response data
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "choices": [{
            "message": {
                "content": "Mocked content for rate limiting test"
            }
        }]
    }
    mock_post.return_value = mock_response
    
    # Make multiple requests in quick succession
    for _ in range(3):
        result = api.search(
            query="test query",
            model="sonar",
            recency_filter="day",
            max_tokens=100
        )
        assert isinstance(result, dict)

if __name__ == "__main__":
    pytest.main([__file__]) 