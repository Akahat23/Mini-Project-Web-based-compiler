FROM python:3.11-slim

# Install system dependencies: compilers (gcc, g++), Java, and Python
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    default-jre \
    default-jdk \
    && rm -rf /var/lib/apt/lists/*

# Setup working directory
WORKDIR /app

# Copy the requirements file and install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn

# Copy the application code
COPY backend/ ./backend/

# Ensure the data and temp directories exist
RUN mkdir -p /app/backend/data /app/backend/temp

# Set the working directory to the backend so server.py can run properly
WORKDIR /app/backend

EXPOSE 5000

# Run the application with Gunicorn, using threading (since async_mode='threading')
CMD ["gunicorn", "-w", "1", "--threads", "100", "-b", "0.0.0.0:5000", "server:app"]
