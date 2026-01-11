# Time-Thread: Conversation & Content Timeline Mapper

A web application that processes long-form transcripts (YouTube, PDFs, Audio) into an interactive, branching visual graph using React Flow.

## 🏗️ Architecture

```
time-thread/
├── frontend/          # Next.js 15+ (App Router)
├── backend/           # FastAPI (Python)
├── docker-compose.yml # Local development orchestration
└── README.md
```

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Components**: Shadcn UI
- **Graph Visualization**: React Flow

### Backend
- **Framework**: FastAPI
- **Language**: Python 3.11+
- **Validation**: Pydantic v2
- **API Docs**: OpenAPI/Swagger (auto-generated)

### Infrastructure
- **Database/Auth**: Supabase (PostgreSQL)
- **Containerization**: Docker & Docker Compose

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Python 3.11+
- Docker & Docker Compose
- pnpm (recommended) or npm

### Local Development

**Option 1: Using Docker Compose (Recommended)**
```bash
docker-compose up --build
```
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

**Option 2: Manual Setup**

Backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend:
```bash
cd frontend
pnpm install
pnpm dev
```

## 📁 Project Structure

### Backend (`/backend`)
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Configuration settings
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py    # API router aggregation
│   │       └── endpoints/
│   │           ├── __init__.py
│   │           ├── graphs.py
│   │           └── transcription.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── graph.py         # Pydantic models
│   └── services/
│       ├── __init__.py
│       └── transcription.py # Transcription service
├── requirements.txt
└── Dockerfile
```

### Frontend (`/frontend`)
```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── dashboard/
│   │       └── page.tsx
│   ├── components/
│   │   ├── ui/              # Shadcn components
│   │   ├── layout/
│   │   │   └── sidebar.tsx
│   │   └── graph/
│   │       └── flow-canvas.tsx
│   ├── lib/
│   │   └── utils.ts
│   └── types/
│       └── graph.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── Dockerfile
```

## 📜 License

MIT
