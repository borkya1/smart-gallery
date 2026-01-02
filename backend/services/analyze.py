
import os
import json
from openai import OpenAI
from fastapi import HTTPException
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
openai_client = OpenAI(api_key=OPENAI_API_KEY)

def analyze_image_with_vision(base64_image: str, extension: str) -> list:
    """
    Sends base64 image to OpenAI Vision model and returns a list of tags.
    """
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API Key not configured")

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Analyze this image and return a JSON object with a list of 'tags' (strings) describing objects, mood, colors, and location."},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/{extension};base64,{base64_image}"
                            },
                        },
                    ],
                }
            ],
            response_format={"type": "json_object"},
            max_tokens=300,
        )
        
        analysis_content = response.choices[0].message.content
        analysis_json = json.loads(analysis_content)
        return analysis_json.get("tags", [])
    except Exception as e:
        print(f"OpenAI Error: {e}")
        return [] # Fallback to empty tags on error
