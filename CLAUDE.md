# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

**DReflowPro** is a full-stack ETL/ELT SaaS platform for SMEs with a FastAPI backend and Next.js frontend.

### Backend Structure (backend/)
- **Python 3.13+** with **FastAPI** framework and **SQLAlchemy** ORM  
- **Architecture**: Layered architecture with models, services, schemas, and API routers
- **Database**: PostgreSQL with async support (asyncpg)
- **Background Jobs**: Celery with Redis
- **Authentication**: OAuth2 + JWT with social login support (Google, GitHub, Microsoft)
- **Key Services**:
  - `connector_service.py`: Data source integration
  - `pipeline_service.py`: ETL pipeline orchestration  
  - `etl_engine/`: Pipeline execution engine
  - `transformations/`: Data transformation logic
  - `visualization_service.py`: Chart/report generation

### Frontend Structure (frontend/)  
- **Next.js 15** with **React 19** and **TypeScript**
- **Styling**: Tailwind CSS v4 with custom brand colors
- **State Management**: React hooks with localStorage persistence
- **Authentication**: JWT tokens with automatic refresh
- **Key Features**:
  - Visual pipeline builder
  - Real-time data analysis dashboard
  - File upload system with drag-and-drop
  - Data visualization with Chart.js
  - Responsive design optimized for mobile

## Common Development Commands

### Backend (FastAPI)
```bash
cd backend

# Development server  
python main.py
# or
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Install dependencies
uv sync

# Database operations
python setup_postgres.py  # Initialize PostgreSQL
python update_schema.py   # Update database schema

# Background workers
./start_workers.sh   # Start Celery workers
./stop_workers.sh    # Stop Celery workers

# Testing
pytest tests/
```

### Frontend (Next.js)
```bash  
cd frontend

# Development server
npm run dev
# Uses Turbopack for faster builds

# Build for production
npm run build

# Linting
npm run lint
```

## API Structure

The API follows RESTful patterns with versioning:
- **Base URL**: `/api/v1/`
- **Authentication**: `/api/v1/auth/` (login, register, OAuth)
- **Connectors**: `/api/v1/connectors/` (data source management)
- **Pipelines**: `/api/v1/pipelines/` (ETL workflow management) 
- **Tasks**: `/api/v1/tasks/` (background job monitoring)
- **Data**: `/api/v1/data/` (data processing endpoints)

## Key Configuration

### Environment Variables
Backend uses Pydantic settings with `.env` support:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection for caching/Celery
- `SECRET_KEY`: JWT signing key (auto-generated if not set)
- OAuth credentials for social login providers

### Database
- Primary: PostgreSQL with async SQLAlchemy
- Cache/Sessions: Redis  
- Models use Pydantic for validation and serialization

## Data Flow Architecture

1. **Data Ingestion**: File uploads or API connectors → temporary storage
2. **Pipeline Processing**: ETL engine executes transformations via Celery tasks
3. **Data Storage**: Processed data stored in PostgreSQL  
4. **Visualization**: Charts/reports generated and cached in Redis
5. **Export**: Results exported as PDF/Excel/PowerPoint

## Authentication Flow

1. Frontend stores JWT tokens in localStorage
2. Automatic token refresh on API calls
3. Social OAuth redirects through `/auth/callback`
4. Backend validates tokens using FastAPI dependencies

## Development Workflow

- Always create a new branch for every new task: branch, test, commit, push
- Follow the existing code structure and naming conventions
- Use TypeScript strict mode for frontend development
- Follow Python type hints for backend development