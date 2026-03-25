FROM python:3.11-slim
 
WORKDIR /app
 
# Install dependencies first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
 
# Copy project
COPY . .
 
EXPOSE 8000
 
# Production: no --reload, multiple workers
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]