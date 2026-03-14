#!/usr/bin/env bash
# IndusAI 2.0 — Pull latest code and update dependencies
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

echo "========================================="
echo "  IndusAI 2.0 — Update Local Environment"
echo "========================================="
echo ""

# -------------------------------------------
# 1. Git: Pull latest from current branch
# -------------------------------------------
BRANCH=$(git branch --show-current)
echo "[1/5] Pulling latest from origin/$BRANCH..."

git fetch origin "$BRANCH" 2>/dev/null || {
    echo "  WARNING: Could not fetch from remote. Continuing with local code."
}
git pull origin "$BRANCH" --ff-only 2>/dev/null || {
    echo "  WARNING: Fast-forward pull failed. You may have local changes."
    echo "  Run 'git stash' then re-run this script, or merge manually."
    exit 1
}
echo "  OK — on branch: $BRANCH"
echo ""

# -------------------------------------------
# 2. Backend: Install Python dependencies
# -------------------------------------------
echo "[2/5] Installing Python dependencies..."
if [ -f "requirements.txt" ]; then
    if [ -d "venv" ]; then
        source venv/bin/activate
        pip install -q -r requirements.txt
        echo "  OK — venv activated, deps installed"
    else
        echo "  No venv found. Creating one..."
        python3 -m venv venv
        source venv/bin/activate
        pip install -q -r requirements.txt
        echo "  OK — venv created and deps installed"
    fi
else
    echo "  SKIP — no requirements.txt found"
fi
echo ""

# -------------------------------------------
# 3. Frontend: Install npm dependencies
# -------------------------------------------
echo "[3/5] Installing frontend dependencies..."
if [ -f "package.json" ]; then
    npm install --silent 2>/dev/null || npm install
    echo "  OK — node_modules up to date"
else
    echo "  SKIP — no package.json found"
fi
echo ""

# -------------------------------------------
# 4. Environment file check
# -------------------------------------------
echo "[4/5] Checking environment configuration..."
if [ ! -f ".env" ]; then
    echo "  No .env file found. Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "  OK — .env created. EDIT IT with your actual API keys:"
        echo "    - ANTHROPIC_API_KEY (required for AI features)"
        echo "    - SECRET_KEY (required for production)"
        echo "    - VOYAGE_API_KEY (optional, for vector search)"
    else
        echo "  WARNING: No .env.example found either."
    fi
else
    echo "  OK — .env exists"
fi
echo ""

# -------------------------------------------
# 5. Docker services check
# -------------------------------------------
echo "[5/5] Checking Docker services..."
if command -v docker &>/dev/null; then
    if docker compose ps --quiet 2>/dev/null | grep -q .; then
        echo "  Docker services already running:"
        docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || docker compose ps
    else
        echo "  Docker services not running."
        echo "  Start them with: docker compose up -d"
    fi
else
    echo "  Docker not installed. You'll need PostgreSQL, Redis, and Neo4j running locally."
fi
echo ""

# -------------------------------------------
# Summary
# -------------------------------------------
echo "========================================="
echo "  Update complete!"
echo "========================================="
echo ""
echo "  Branch:   $BRANCH"
echo "  Backend:  Python $(python3 --version 2>/dev/null | cut -d' ' -f2 || echo 'not found')"
echo "  Frontend: Node $(node --version 2>/dev/null || echo 'not found')"
echo ""
echo "  Next steps:"
echo "    1. Start services:  docker compose up -d"
echo "    2. Run demo:        bash scripts/demo.sh"
echo "    3. Dev backend:     uvicorn main:app --reload --port 8000"
echo "    4. Dev frontend:    npm run dev"
echo ""
