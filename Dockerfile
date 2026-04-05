FROM python:3.11-slim

RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

RUN pip3 install -r requirements.txt
RUN cd frontend && npm install && npm run build

CMD ["python3", "start.py"]