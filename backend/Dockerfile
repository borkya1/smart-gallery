FROM python:3.9-slim

WORKDIR /app

# Install system dependencies (none needed for basic python app, but keeping structure)
# Rule 9: Use quiet flags if we were running apt-get, but we are not right now.

# Copy requirements first for caching
COPY requirements.txt .

# Rule 9: Quiet pip install
RUN pip install --no-cache-dir -q -r requirements.txt

# Copy application code
COPY . .

# Expose port (Cloud Run defaults to 8080)
EXPOSE 8080

# Command to run (Use 8080 to match Cloud Run expected port)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
