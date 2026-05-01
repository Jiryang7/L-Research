FROM python:3.11-slim

RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean

WORKDIR /app
COPY requirements.txt package.json ./
RUN pip install -r requirements.txt && npm install

COPY . .
CMD ["python3", "bot.py"]
