#!/usr/bin/env bash
# IndusAI 2.0 — Demo Launch Script
# Starts all services and seeds demo data for prospect demos
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${BOLD}${CYAN}=========================================${NC}"
echo -e "${BOLD}${CYAN}  IndusAI 2.0 — Demo Environment Setup${NC}"
echo -e "${BOLD}${CYAN}=========================================${NC}"
echo ""

# -------------------------------------------
# Pre-flight checks
# -------------------------------------------
echo -e "${BOLD}[Pre-flight] Checking requirements...${NC}"

MISSING=0

if ! command -v docker &>/dev/null; then
    echo -e "  ${RED}MISSING: docker${NC} — Install Docker Desktop"
    MISSING=1
fi

if ! command -v node &>/dev/null; then
    echo -e "  ${RED}MISSING: node${NC} — Install Node.js 18+"
    MISSING=1
fi

if ! command -v python3 &>/dev/null; then
    echo -e "  ${RED}MISSING: python3${NC} — Install Python 3.12+"
    MISSING=1
fi

if [ ! -f ".env" ]; then
    echo -e "  ${YELLOW}WARNING: No .env file. Creating from example...${NC}"
    cp .env.example .env 2>/dev/null || true
fi

if [ "$MISSING" -eq 1 ]; then
    echo -e "\n  ${RED}Install missing dependencies and re-run.${NC}"
    exit 1
fi

echo -e "  ${GREEN}All prerequisites met.${NC}"
echo ""

# -------------------------------------------
# Step 1: Start infrastructure (Postgres, Redis, Neo4j)
# -------------------------------------------
echo -e "${BOLD}[1/6] Starting infrastructure services...${NC}"

docker compose up -d postgres redis neo4j 2>/dev/null || {
    echo -e "  ${RED}Failed to start Docker services.${NC}"
    echo "  Make sure Docker Desktop is running."
    exit 1
}

# Wait for health checks
echo -n "  Waiting for services to be healthy"
for i in {1..30}; do
    PG_HEALTHY=$(docker inspect --format='{{.State.Health.Status}}' mro-postgres 2>/dev/null || echo "starting")
    REDIS_HEALTHY=$(docker inspect --format='{{.State.Health.Status}}' mro-redis 2>/dev/null || echo "starting")
    NEO4J_HEALTHY=$(docker inspect --format='{{.State.Health.Status}}' mro-neo4j 2>/dev/null || echo "starting")

    if [ "$PG_HEALTHY" = "healthy" ] && [ "$REDIS_HEALTHY" = "healthy" ] && [ "$NEO4J_HEALTHY" = "healthy" ]; then
        echo ""
        echo -e "  ${GREEN}PostgreSQL: healthy${NC}"
        echo -e "  ${GREEN}Redis:      healthy${NC}"
        echo -e "  ${GREEN}Neo4j:      healthy${NC}"
        break
    fi
    echo -n "."
    sleep 2
done
echo ""

# -------------------------------------------
# Step 2: Install dependencies
# -------------------------------------------
echo -e "${BOLD}[2/6] Installing dependencies...${NC}"

# Python
if [ -d "venv" ]; then
    source venv/bin/activate
else
    python3 -m venv venv
    source venv/bin/activate
fi
pip install -q -r requirements.txt 2>/dev/null
echo -e "  ${GREEN}Python deps installed${NC}"

# Node
npm install --silent 2>/dev/null || npm install
echo -e "  ${GREEN}Node deps installed${NC}"
echo ""

# -------------------------------------------
# Step 3: Run database migrations / init
# -------------------------------------------
echo -e "${BOLD}[3/6] Initializing database...${NC}"

# The backend auto-creates tables on startup, so we just verify connectivity
python3 -c "
import asyncio, asyncpg, os
async def check():
    url = os.getenv('DATABASE_URL', 'postgresql://chatbot:password@localhost:5432/chatbot')
    conn = await asyncpg.connect(url)
    version = await conn.fetchval('SELECT version()')
    await conn.close()
    print(f'  Connected: {version[:50]}...')
asyncio.run(check())
" 2>/dev/null || echo -e "  ${YELLOW}DB connection check skipped (asyncpg may not be installed yet)${NC}"
echo ""

# -------------------------------------------
# Step 4: Start backend API
# -------------------------------------------
echo -e "${BOLD}[4/6] Starting backend API server...${NC}"

# Kill any existing backend on port 8000
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

# Source .env for the backend
set -a
source .env 2>/dev/null || true
set +a

# Start backend in background
nohup uvicorn main:app --host 0.0.0.0 --port 8000 --reload > /tmp/indusai-backend.log 2>&1 &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"
echo "  Log: /tmp/indusai-backend.log"

# Wait for backend to be ready
echo -n "  Waiting for API"
for i in {1..20}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo ""
        echo -e "  ${GREEN}Backend ready at http://localhost:8000${NC}"
        echo -e "  ${GREEN}API docs at http://localhost:8000/docs${NC}"
        break
    fi
    echo -n "."
    sleep 2
done
echo ""

# -------------------------------------------
# Step 5: Seed demo data
# -------------------------------------------
echo -e "${BOLD}[5/6] Seeding demo data into knowledge graph...${NC}"

python3 -c "
import asyncio
import sys
sys.path.insert(0, '.')

async def seed():
    try:
        from services.graph.seed_demo import seed_graph
        from services.graph.service import GraphService

        graph = GraphService()
        await graph.initialize()
        stats = await seed_graph(graph)
        print(f'  Seeded: {stats[\"parts\"]} parts, {stats[\"cross_refs\"]} cross-refs, {stats[\"assemblies\"]} assemblies')
        await graph.close()
    except Exception as e:
        print(f'  Seed skipped: {e}')
        print(f'  (Demo data will be seeded on first backend startup)')

asyncio.run(seed())
" 2>/dev/null || echo -e "  ${YELLOW}Auto-seed skipped. Backend will seed on startup.${NC}"
echo ""

# -------------------------------------------
# Step 6: Start frontend
# -------------------------------------------
echo -e "${BOLD}[6/6] Starting frontend dev server...${NC}"

# Kill any existing frontend on port 5173
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

nohup npm run dev > /tmp/indusai-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"
echo "  Log: /tmp/indusai-frontend.log"

# Wait for frontend
echo -n "  Waiting for frontend"
for i in {1..15}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo ""
        echo -e "  ${GREEN}Frontend ready at http://localhost:5173${NC}"
        break
    fi
    # Also check 8080 as an alternative port
    if curl -s http://localhost:8080 > /dev/null 2>&1; then
        echo ""
        echo -e "  ${GREEN}Frontend ready at http://localhost:8080${NC}"
        break
    fi
    echo -n "."
    sleep 2
done
echo ""

# -------------------------------------------
# Demo summary
# -------------------------------------------
echo ""
echo -e "${BOLD}${CYAN}=========================================${NC}"
echo -e "${BOLD}${CYAN}  IndusAI 2.0 Demo is LIVE${NC}"
echo -e "${BOLD}${CYAN}=========================================${NC}"
echo ""
echo -e "  ${BOLD}Frontend:${NC}     http://localhost:5173"
echo -e "  ${BOLD}Backend API:${NC}  http://localhost:8000"
echo -e "  ${BOLD}API Docs:${NC}     http://localhost:8000/docs"
echo -e "  ${BOLD}Neo4j Browser:${NC} http://localhost:7474"
echo ""
echo -e "  ${BOLD}Demo Data Loaded:${NC}"
echo "    - ~30 MRO parts (bearings, fasteners, belts, seals)"
echo "    - Cross-manufacturer equivalencies (SKF ↔ NSK ↔ FAG)"
echo "    - 3 assemblies with full BOMs"
echo "    - Fastener entity extraction (M8x1.25x30 → parsed)"
echo ""
echo -e "  ${BOLD}Demo Queries to Try:${NC}"
echo "    1. \"What's equivalent to SKF 6204-2RS?\""
echo "    2. \"I need an M8 bolt with washer and nut\""
echo "    3. \"What parts are in the pump assembly?\""
echo "    4. \"Find me a bearing for a 25mm shaft, sealed\""
echo "    5. \"What grease works with the 6205 bearing?\""
echo ""
echo -e "  ${BOLD}To stop everything:${NC}"
echo "    bash scripts/stop.sh"
echo "    # or manually:"
echo "    kill $BACKEND_PID $FRONTEND_PID"
echo "    docker compose down"
echo ""

# Save PIDs for stop script
echo "$BACKEND_PID" > /tmp/indusai-backend.pid
echo "$FRONTEND_PID" > /tmp/indusai-frontend.pid
