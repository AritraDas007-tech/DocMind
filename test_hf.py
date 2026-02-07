import os
from dotenv import load_dotenv
import requests

load_dotenv()
token = os.getenv("HUGGINGFACEHUB_API_TOKEN")

print(f"Token found: {'Yes' if token else 'No'}")
if token:
    print(f"Token prefix: {token[:7]}...")
    
    # Try a simple request to Hugging Face API to check token validity
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get("https://huggingface.co/api/whoami-v2", headers=headers)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
