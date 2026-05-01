FROM python:3.11-slim

RUN apt-get update && apt-get install -y curl chromium fonts-noto-cjk --no-install-recommends && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY requirements.txt package.json ./
RUN pip install -r requirements.txt && npm install

COPY . .
CMD ["python3", "bot.py"]
