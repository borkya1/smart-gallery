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

# Expose port
EXPOSE 8000

# Command to run
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
