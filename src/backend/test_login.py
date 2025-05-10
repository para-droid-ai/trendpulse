import requests
import json

def test_login(email="user@test.com", password="test1234"):
    """Test login functionality and print the token"""
    try:
        # Create form data for login
        login_data = {"username": email, "password": password}
        
        # Make the request
        response = requests.post(
            "http://localhost:8000/token",
            data=login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        # Check response
        if response.status_code == 200:
            token_data = response.json()
            token = token_data.get("access_token")
            
            print(f"✅ Login successful!")
            print(f"Token: {token}")
            
            # Test the /topic-streams/ endpoint with this token
            print("\nTesting /topic-streams/ endpoint...")
            streams_response = requests.get(
                "http://localhost:8000/topic-streams/",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if streams_response.status_code == 200:
                streams = streams_response.json()
                print(f"✅ Successfully retrieved {len(streams)} topic streams!")
                for stream in streams:
                    print(f"  → Stream ID: {stream['id']}, Query: {stream['query']}")
            else:
                print(f"❌ Failed to get topic streams. Status: {streams_response.status_code}")
                print(f"Response: {streams_response.text}")
                
        else:
            print(f"❌ Login failed with status code: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error during test: {str(e)}")

if __name__ == "__main__":
    # Run the test with default credentials
    test_login()
    
    # Uncomment to test with different credentials
    # test_login("email@example.com", "your_password") 