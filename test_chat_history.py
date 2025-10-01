#!/usr/bin/env python3
"""
Test script to demonstrate the chat history functionality
"""

import requests
import json

# Test data with chat history
test_data = {
    "question": "What job positions are available?",
    "chat_history": [
        {"user": "Hello, I'm looking for job opportunities"},
        {"clubot": "Hey there! 🚀 Welcome to Cluster! We have amazing opportunities waiting for you!"},
        {"user": "What kind of roles do you have?"},
        {"clubot": "We have roles in tech, design, product, and more! What interests you most? 💼"}
    ]
}

def test_chat_history():
    """Test the chat history functionality"""
    try:
        # Make request to the endpoint
        response = requests.post(
            'http://localhost:5000/ask-cluster-ai',
            json=test_data,
            headers={'Content-Type': 'application/json'}
        )
        
        print("Status Code:", response.status_code)
        print("Response:", json.dumps(response.json(), indent=2))
        
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the server. Make sure the Flask app is running on localhost:5000")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_chat_history()
