#!/bin/bash
# -----------------------------------------------------------------------------
# Smart Hotel - One-Click Cloud VM Deployment Script
# Works on Ubuntu 20.04/22.04 LTS (AWS EC2, DigitalOcean, GCP, Linode)
# -----------------------------------------------------------------------------

set -e

echo "🚀 Starting Smart Hotel Cloud Deployment..."

# 1. Update system packages
sudo apt-get update -y
sudo apt-get upgrade -y

# 2. Install Docker & Docker Compose if not present
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "📦 Installing Docker Compose plugin..."
    sudo apt-get install -y docker-compose-plugin
fi

# 3. Pull latest changes and start production container stack
echo "🏗️ Building and deploying containers..."
sudo docker compose -f docker-compose.yml up --build -d

# 4. Run database migrations inside running backend container
echo "🗄️ Running Django database migrations..."
sleep 5
sudo docker exec smarthotel_backend python manage.py migrate

echo "✅ Smart Hotel is live and deployed successfully!"
echo "🌐 Access Frontend on http://YOUR_SERVER_IP/"
echo "⚙️ Access Backend API on http://YOUR_SERVER_IP:8000/"
