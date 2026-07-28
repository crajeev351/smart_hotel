# 🌐 Smart Hotel Cloud Deployment Guide (Kubernetes)

This guide provides step-by-step instructions to deploy the containerized **Smart Hotel** application to an auto-scaling Kubernetes cluster (such as **Google Kubernetes Engine (GKE)** or **Amazon Elastic Kubernetes Service (EKS)**).

---

## 🏗️ Architecture Overview

The Kubernetes deployment orchestrates four primary services:
1. **Frontend**: Scalable React app served by Nginx (`frontend-service`, port `80`) with Horizontal Pod Autoscaler.
2. **Backend**: Scalable Django API served by Gunicorn (`backend-service`, port `8000`) with Horizontal Pod Autoscaler.
3. **Database**: Stateful PostgreSQL container (`postgres-service`, port `5432`) attached to persistent cloud SSD storage via a PersistentVolumeClaim.
4. **Cache**: Redis container (`redis-service`, port `6379`) for session storage and rate-limiting.
5. **Ingress**: An Nginx Ingress Controller routing `/api/` and `/admin/` requests to the backend, and all other traffic to the frontend.

---

## 📋 Prerequisites
Before deploying, make sure you have the following CLI tools installed:
- [Docker CLI](https://docs.docker.com/get-docker/)
- Cloud SDK ([AWS CLI](https://aws.amazon.com/cli/) or [Google Cloud SDK](https://cloud.google.com/sdk))
- [kubectl](https://kubernetes.io/docs/tasks/tools/) (Kubernetes command-line tool)

---

## 🚀 Step-by-Step Deployment Instructions

### Step 1: Set Up Your Cloud Registry
First, create repositories to host your Docker images in the cloud.

#### For Google Cloud (Artifact Registry):
```bash
# Authenticate with Google Cloud
gcloud auth login

# Create a repository for your images
gcloud artifacts repositories create smarthotel-repo \
    --repository-format=docker \
    --location=us-central1 \
    --description="Docker repository for Smart Hotel"
```

#### For AWS (Elastic Container Registry - ECR):
```bash
# Authenticate with AWS
aws configure

# Create repositories
aws ecr create-repository --repository-name smarthotel-backend
aws ecr create-repository --repository-name smarthotel-frontend
```

---

### Step 2: Build and Push Docker Images
Tag and push your local Docker images to your cloud registry. Replace `REGISTRY_URL` with your actual container registry endpoint.

```bash
# Define your registry URL (Example for AWS ECR: 123456789012.dkr.ecr.us-east-1.amazonaws.com)
export REGISTRY_URL="YOUR_REGISTRY_URL"

# 1. Build and push Backend
docker build -t $REGISTRY_URL/smarthotel-backend:latest ./backend
docker push $REGISTRY_URL/smarthotel-backend:latest

# 2. Build and push Frontend
docker build -t $REGISTRY_URL/smarthotel-frontend:latest ./frontend
docker push $REGISTRY_URL/smarthotel-frontend:latest
```

> [!IMPORTANT]
> Once your images are pushed, open `kubernetes/backend-deployment.yaml` and `kubernetes/frontend-deployment.yaml` and replace the placeholder `image: smarthotel-backend:latest` with your full registry image path (e.g. `123456789012.dkr.ecr.us-east-1.amazonaws.com/smarthotel-backend:latest`).

---

### Step 3: Spin Up Your Kubernetes Cluster
Create a managed cluster that automatically scales your virtual machine nodes under load.

#### For Google Cloud (GKE):
```bash
gcloud container clusters create-auto smarthotel-cluster \
    --region us-central1 \
    --project YOUR_PROJECT_ID
```
*(GKE Autopilot manages node scaling and pod resources automatically.)*

#### For AWS (EKS using `eksctl`):
```bash
eksctl create cluster \
  --name smarthotel-cluster \
  --version 1.30 \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 2 \
  --nodes-min 2 \
  --nodes-max 5 \
  --asg-access
```

Connect your local `kubectl` to the new cluster:
```bash
# GKE
gcloud container clusters get-credentials smarthotel-cluster --region us-central1

# EKS
aws eks update-kubeconfig --region us-east-1 --name smarthotel-cluster
```

---

### Step 4: Deploy the App to Kubernetes
Apply the configuration manifests from your terminal. Make sure you are in the directory containing your `kubernetes/` folder.

```bash
# 1. Apply config and secrets
kubectl apply -f kubernetes/configmap.yaml
kubectl apply -f kubernetes/secrets.yaml

# 2. Start PostgreSQL and Redis (infrastructure dependency)
kubectl apply -f kubernetes/postgres-deployment.yaml
kubectl apply -f kubernetes/redis-deployment.yaml

# Wait a moment for PostgreSQL to start up...
kubectl rollout status deployment/postgres-deployment

# 3. Start Backend and Frontend
kubectl apply -f kubernetes/backend-deployment.yaml
kubectl apply -f kubernetes/frontend-deployment.yaml

# 4. Apply Ingress routes
kubectl apply -f kubernetes/ingress.yaml
```

---

### Step 5: Install Ingress Controller (Load Balancer)
In order to route public internet traffic to your cluster, install Nginx Ingress Controller (which provisions a Cloud Load Balancer):

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml
```

Wait for the public IP address to be assigned to your Ingress controller:
```bash
kubectl get ingress smarthotel-ingress --watch
```

Once the `ADDRESS` column is populated with an IP (e.g. `34.120.10.150` or an AWS DNS name), point your browser to that address to view the running application!

---

### Step 6: Database Seeding in Kubernetes
Just like in local Docker development, your Postgres database starts empty. Run the Django migrations and seeding commands directly inside the running backend pod.

```bash
# Get the name of a running backend pod
export BACKEND_POD=$(kubectl get pods -l service=backend -o jsonpath="{.items[0].metadata.name}")

# Run Django migrations (usually handled by initContainer, but can be run manually)
kubectl exec -it $BACKEND_POD -- python manage.py migrate

# Seed data
kubectl exec -it $BACKEND_POD -- python seed_rooms.py
kubectl exec -it $BACKEND_POD -- python seed_tables.py
kubectl exec -it $BACKEND_POD -- python seed_bookings.py

# Create a custom superuser
kubectl exec -it $BACKEND_POD -- python manage.py createsuperuser
```

---

### 📈 Verification and Auto-Scaling

* **Check the Horizontal Pod Autoscalers**:
  ```bash
  kubectl get hpa
  ```
  *(You will see current and target CPU utilization. If CPU usage crosses the threshold set in the manifests, Kubernetes will immediately spin up more replicas.)*

* **Simulate Load (Testing scaling)**:
  To see pods scale up, you can run a temporary busybox pod to send concurrent requests:
  ```bash
  kubectl run netshoot --rm -i --tty --image nicolaka/netshoot -- /bin/bash
  # Inside shell, run load test:
  ab -n 10000 -c 100 http://backend-service:8000/api/rooms/
  ```

---

## 🧹 Tearing Down
To delete all cloud resources and stop incurring billing:
```bash
# Delete all Kubernetes resources
kubectl delete -f kubernetes/

# Delete the Kubernetes cluster
gcloud container clusters delete smarthotel-cluster --region us-central1
# OR (for AWS)
eksctl delete cluster --name smarthotel-cluster --region us-east-1
```
