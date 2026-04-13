# 1. Start with a lightweight Python image
FROM python:3.12-slim

# 2. Install Java (required for KoNLPy)
RUN apt-get update && apt-get install -y default-jre

# 3. Set the working directory inside the container
WORKDIR /app

# 4. Install the Python libraries
# (If you have a requirements.txt, use COPY requirements.txt . and RUN pip install -r requirements.txt instead)
RUN pip install fastapi uvicorn edge-tts pydantic konlpy httpx deep-translator

# 5. Copy all your code from the Droplet into the container
COPY . .

# 6. Tell the container how to run the app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]