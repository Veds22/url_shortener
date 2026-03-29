# Use an official Python runtime as a Base image
FROM python:3.11-slim
# Set the working directory in the container
WORKDIR /app
# Copy dependencies file to the working directory
COPY requirements.txt .
# Install any depnedencies
RUN pip install --no-cache-dir -r requirements.txt
# Copy the content of the full project
COPY . .
# Expose the port the app runs on
EXPOSE 8000
# Command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]