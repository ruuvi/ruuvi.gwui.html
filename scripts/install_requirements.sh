#!/bin/bash

set -x

# Check if the .venv directory exists
if [ ! -d ".venv" ]; then
    echo ".venv not found. Creating virtual environment..."
    # Create the virtual environment
    python3 -m venv .venv
    echo ".venv has been created."
else
    echo ".venv already exists."
fi

# Activate the virtual environment
source .venv/bin/activate

# Install requirements from requirements.txt
if [ -f "requirements.txt" ]; then
    echo "Installing requirements from requirements.txt..."
    pip install -r requirements.txt
    echo "Requirements have been installed."
else
    echo "requirements.txt not found. Skipping package installation."
fi

# Deactivate the virtual environment
deactivate

