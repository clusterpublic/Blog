#!/usr/bin/env python3
"""
Test script to demonstrate the chat history functionality
"""

import requests
import json

# Test data with chat history and page URL
test_data = {
    "question": "What is this blog about?",
    "page_url": "https://example.com/blog/some-blog-id",
    "chat_history": [
        {"User": "Hello, I'm looking for job opportunities"},
        {"Cluster Help": "Hey there! 🚀 Welcome to Cluster Protocol! We have amazing opportunities waiting for you!"},
        {"User": "What kind of roles do you have?"},
        {"Cluster Help": "We have roles in tech, design, product, and more! What interests you most? 💼"}
    ]
}

# Test data for non-blog page
test_data_homepage = {
    "question": "What job positions are available?",
    "page_url": "https://example.com/",
    "chat_history": [
        {"User": "Hello, I'm looking for job opportunities"},
        {"Cluster Help": "Hey there! 🚀 Welcome to Cluster! We have amazing opportunities waiting for you!"}
    ]
}

def test_chat_history():
    """Test the chat history functionality"""
    try:
        # Test blog page scenario
        print("=== Testing Blog Page Scenario (should include blog content) ===")
        print(f"URL: {test_data['page_url']}")
        response = requests.post(
            'http://localhost:5000/ask-cluster-ai',
            json=test_data,
            headers={'Content-Type': 'application/json'}
        )
        
        print("Status Code:", response.status_code)
        print("Response:", json.dumps(response.json(), indent=2))
        
        print("\n" + "="*50 + "\n")
        
        # Test homepage scenario
        print("=== Testing Homepage Scenario (should NOT include blog content) ===")
        print(f"URL: {test_data_homepage['page_url']}")
        response2 = requests.post(
            'http://localhost:5000/ask-cluster-ai',
            json=test_data_homepage,
            headers={'Content-Type': 'application/json'}
        )
        
        print("Status Code:", response2.status_code)
        print("Response:", json.dumps(response2.json(), indent=2))
        
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the server. Make sure the Flask app is running on localhost:5000")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_chat_history()
