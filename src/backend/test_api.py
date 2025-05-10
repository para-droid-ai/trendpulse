import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def print_response(response):
    print(f"Status Code: {response.status_code}")
    print("Headers:", response.headers)
    print("Response Text:", response.text)
    try:
        return response.json()
    except:
        return None

def create_user(email, password):
    response = requests.post(
        f"{BASE_URL}/users/",
        json={"email": email, "password": password}
    )
    return print_response(response)

def login(email, password):
    response = requests.post(
        f"{BASE_URL}/token",
        data={"username": email, "password": password}
    )
    return print_response(response)

def create_topic_stream(token, query, update_frequency="hourly", detail_level="detailed", model_type="sonar-pro", recency_filter="day"):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    data = {
        "query": query,
        "update_frequency": update_frequency,
        "detail_level": detail_level,
        "model_type": model_type,
        "recency_filter": recency_filter
    }
    print("Request data:", json.dumps(data, indent=2))
    response = requests.post(
        f"{BASE_URL}/topic-streams/",
        headers=headers,
        json=data
    )
    return print_response(response)

try:
    # Create a test user
    print("\nCreating user...")
    user = create_user("test@example.com", "test123")

    # Login
    print("\nLogging in...")
    token_data = login("test@example.com", "test123")
    
    if token_data and "access_token" in token_data:
        # Create a topic stream
        print("\nCreating topic stream...")
        topic_stream = create_topic_stream(
            token_data["access_token"],
            "Latest AI model releases from Gemini, Claude, OpenAI, DeepSeek, etc.",
            update_frequency="hourly",
            detail_level="detailed",
            model_type="sonar-pro",
            recency_filter="week"
        )
    else:
        print("Failed to get access token")
except Exception as e:
    print(f"Error: {str(e)}") 