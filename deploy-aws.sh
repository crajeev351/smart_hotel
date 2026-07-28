#!/bin/bash
# -----------------------------------------------------------------------------
# Smart Hotel - AWS EC2 Free Tier (t2.micro / t3.micro) One-Click Deployment
# -----------------------------------------------------------------------------

set -e

echo "🚀 Starting Smart Hotel AWS EC2 Free Tier Setup..."

# 1. Enable 2GB Swap Space (Crucial for t2.micro / t3.micro 1GB RAM)
if [ ! -f /swapfile ]; then
    echo "🧠 Creating 2GB Swap file for memory safety..."
    sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# 2. Update System Packages
echo "🔄 Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# 3. Install Docker & Docker Compose Plugin
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

if ! docker compose version &> /dev/null; then
    echo "📦 Installing Docker Compose..."
    sudo apt-get install -y docker-compose-plugin
fi

# 4. Build & Launch Docker Containers
echo "🏗️ Building and deploying Smart Hotel containers..."
sudo docker compose up --build -d

# 5. Run Database Migrations & Initial Setup
echo "🗄️ Running Django Database Migrations..."
sleep 5
sudo docker exec smarthotel_backend python manage.py migrate

echo "======================================================="
echo "✅ Smart Hotel is LIVE on AWS EC2!"
echo "🌐 Frontend Access: http://$(curl -s ifconfig.me)/"
echo "⚙️ Backend API:     http://$(curl -s ifconfig.me):8000/"
echo "======================================================="
