# 1. Start with a lightweight Python image
FROM python:3.12-slim

# 2. Prevent apt from pausing to ask for user input
ENV DEBIAN_FRONTEND=noninteractive

# 3. Install HEADLESS Java (and clean up the cache to save disk space)
RUN apt-get update && apt-get install -y default-jre-headless && rm -rf /var/lib/apt/lists/*

# 4. Set the working directory
WORKDIR /app

# 5. Install the Python libraries
RUN pip install fastapi uvicorn edge-tts pydantic konlpy httpx deep-translator

# 6. Copy your code
COPY . .

# 7. Run the app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]