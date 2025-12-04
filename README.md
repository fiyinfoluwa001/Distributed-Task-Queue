# Distributed Task Queue & Scheduler (DTQ)

**A fault-tolerant, offline-first, priority-aware task queue built for remote teams**

[![Node.js](https://img.shields.io/badge/Node.js-18-green)](https://nodejs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-red)](https://nestjs.com/)
[![GraphQL](https://img.shields.io/badge/GraphQL-Apollo-pink)](https://www.apollographql.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8-blue)](https://www.mysql.com/)
[![Redis](https://img.shields.io/badge/Redis-7-red)](https://redis.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A **scalable, production-ready** distributed task queue designed for remote and distributed teams. Supports **priority queues**, **exponential retry with dead-letter queue**, **distributed locking**, **offline sync**, **recurring jobs**, **GraphQL API**, **JWT auth**, and **Prometheus monitoring**.

Perfect for scheduling reports, sending notifications, processing uploads — even when workers are offline or network is unstable.

---

## ✨ Features

| Feature                     | Status | Description                                            |
| --------------------------- | ------ | ------------------------------------------------------ |
| GraphQL API                 | ✅     | Full GraphQL schema with subscriptions                 |
| Priority Queues             | ✅     | High-priority tasks jump ahead using Redis Sorted Sets |
| Fault Tolerance & Retries   | ✅     | Exponential backoff + Dead Letter Queue                |
| Distributed Locking         | ✅     | Prevents duplicate processing (`SETNX`)                |
| Offline-First Workers       | ✅     | SQLite local cache + auto-sync when online             |
| Recurring / Scheduled Jobs  | ✅     | `node-cron` + Luxon timezone support                   |
| JWT Authentication          | ✅     | Admin, Worker, and Viewer roles                        |
| Role-Based Access Control   | ✅     | Guard-based authorization                              |
| Health & Prometheus Metrics | ✅     | `/health`, `/metrics` (Prometheus-ready)               |
| Horizontal Scaling          | ✅     | Scale workers with Docker Compose                      |
| GraphQL Subscriptions       | ✅     | Real-time task updates via WebSocket                   |
| Full Test Suite             | ✅     | Unit + Integration + Load tests                        |

---

## 🏗️ Architecture Overview

```
┌──────────────────┐
│   API Gateway    │
│  (NestJS Router) │
└────────┬─────────┘
         │
    ┌────┴────────────────────────┐
    │                             │
    ▼                             ▼
┌─────────────┐        ┌──────────────────┐
│  GraphQL    │        │   REST Auth      │
│  Resolvers  │        │   Endpoints      │
└────┬────────┘        └──────────────────┘
     │
     ▼
┌──────────────────────────────────────────────┐
│         Business Logic Services              │
│  (TaskService, QueueService, AuthService)    │
└────┬────────────────────┬──────────┬─────────┘
     │                    │          │
     ▼                    ▼          ▼
┌──────────┐      ┌──────────┐  ┌─────────┐
│  MySQL   │      │  Redis   │  │ Workers │
│ (Metadata)      │ (Queue)  │  │(Async)  │
└──────────┘      └──────────┘  └─────────┘
                        │
                        ▼
                 ┌──────────────┐
                 │  Scheduler   │
                 │ (Cron Jobs)  │
                 └──────────────┘
```

---

## 📁 Project Structure

```
DTQ/
├── src/
│   ├── config/
│   │   ├── database.config.ts       # TypeORM configuration
│   │   └── graphql.config.ts        # Apollo GraphQL config
│   ├── entities/
│   │   ├── task.entity.ts           # Task data model
│   │   ├── worker.entity.ts         # Worker registration
│   │   └── user.entity.ts           # Auth users
│   ├── graphql/
│   │   ├── resolvers/
│   │   │   ├── task.resolver.ts     # Task mutations/queries
│   │   │   ├── worker.resolver.ts
│   │   │   └── health.resolver.ts
│   │   └── dto/
│   │       ├── task.dto.ts
│   │       ├── worker.dto.ts
│   │       └── create-task.input.ts
│   ├── services/
│   │   ├── task.service.ts          # Task CRUD & logic
│   │   ├── task-queue.service.ts    # Queue operations
│   │   ├── redis.service.ts         # Redis client wrapper
│   │   ├── worker.service.ts        # Worker lifecycle
│   │   ├── scheduler.service.ts     # Recurring jobs
│   │   └── metrics.service.ts       # Prometheus metrics
│   ├── auth/
│   │   ├── jwt.strategy.ts
│   │   ├── jwt-auth.guard.ts
│   │   ├── roles.guard.ts
│   │   └── auth.service.ts
│   ├── filters/
│   │   └── graphql-error.filter.ts
│   ├── app.module.ts
│   └── main.ts
├── infra/
│   ├── docker-compose.yml
│   ├── .env.example
│   └── scripts/
│       ├── db-init.sql
│       └── seed-users.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── load/
│       └── load-test.yml
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API-GUIDE.md
│   ├── DEPLOYMENT.md
│   └── GRAPHQL-SCHEMA.md
├── .env.example
├── docker-compose.yml
├── package.json
└── README.md
```

---

## 🚀 Quick Start (5 minutes)

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- MySQL client (optional, for debugging)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/DTQ.git
cd DTQ

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Start infrastructure (MySQL, Redis)
cd infra
docker compose up -d

# Apply database migrations
cd ../
npm run typeorm migration:run

# Start the API (development mode with hot-reload)
npm run start:dev
```

**Done!** Your DTQ is now running:

- **GraphQL Playground**: http://localhost:3000/graphql
- **Health Check**: http://localhost:3000/health
- **Metrics**: http://localhost:3000/metrics

---

## 📊 Services & Ports

| Service     | Port   | Purpose                    |
| ----------- | ------ | -------------------------- |
| API/GraphQL | `3000` | Main application           |
| MySQL       | `3306` | Task metadata              |
| Redis       | `6379` | Queue & locks              |
| Prometheus  | `9090` | Metrics scraper (optional) |

---

## 🔌 GraphQL API Endpoints

### Query Examples

```graphql
# Get all tasks
query {
  tasks(status: "pending", limit: 50) {
    id
    name
    priority
    status
    createdAt
    error
  }
}

# Get single task details
query {
  task(id: "uuid-here") {
    id
    name
    payload
    status
    retries
    maxRetries
  }
}

# Get workers
query {
  workers {
    id
    name
    activeTaskCount
    isOnline
    lastHeartbeat
  }
}
```

### Mutation Examples

```graphql
# Create a task
mutation {
  createTask(
    input: {
      name: "send-email"
      payload: { email: "user@example.com" }
      priority: 10
    }
  ) {
    id
    status
    createdAt
  }
}

# Create recurring task (daily at 2am)
mutation {
  createTask(
    input: {
      name: "daily-report"
      payload: { reportType: "sales" }
      cronExpression: "0 2 * * *"
      isRecurring: true
    }
  ) {
    id
  }
}

# Retry a failed task
mutation {
  retryTask(id: "task-uuid") {
    id
    status
    retries
  }
}

# Cancel task
mutation {
  cancelTask(id: "task-uuid")
}
```

### Real-Time Subscriptions

```graphql
# Subscribe to new tasks
subscription {
  taskCreated {
    id
    name
    status
  }
}

# Subscribe to task status changes
subscription {
  taskStatusChanged {
    id
    status
    completedAt
  }
}
```

---

## 🔐 Authentication

### Login (Get JWT Token)

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

Response:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "admin"
  }
}
```

### Use Token in GraphQL Requests

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "query": "{ tasks { id } }" }'
```

### Roles

- **admin**: Full access (create, update, delete tasks)
- **worker**: Can process tasks and heartbeat
- **viewer**: Read-only access

---

## 🔄 Task Lifecycle

```
┌─────────┐
│ PENDING │  ← Task created, waiting in queue
└────┬────┘
     │
     ▼
┌──────────────┐
│ PROCESSING   │  ← Worker picked up task
└────┬─────────┘
     │
     ├─────────────────────────┬──────────────────────────┐
     │                         │                          │
     ▼                         ▼                          ▼
┌──────────┐         ┌─────────────────┐        ┌──────────────┐
│COMPLETED │         │     PENDING     │        │    FAILED    │
│(Success) │         │  (Retry Count<) │        │(Max Retries) │
└──────────┘         └────────┬────────┘        └──────────────┘
                              │                         │
                              │ (exponential backoff)   │
                              └──────┬──────────────────┘
                                     │
                                     ▼
                           ┌──────────────────┐
                           │  DEAD_LETTER     │
                           │  (Failed, DLQ)   │
                           └──────────────────┘
```

---

## 📈 Monitoring & Metrics

### Health Check

```bash
curl http://localhost:3000/health

# Response:
{
  "status": "ok",
  "timestamp": "2024-01-20T10:00:00Z",
  "uptime": 3600,
  "workers": {
    "online": 5,
    "total": 5
  },
  "queue": {
    "depth": 42,
    "deadLetter": 2
  }
}
```

### Prometheus Metrics

```bash
curl http://localhost:3000/metrics

# Metrics include:
dtq_tasks_total{status="completed"} 1024
dtq_tasks_total{status="failed"} 12
dtq_queue_depth 42
dtq_task_duration_seconds_bucket{le="1"} 892
```

---

## 🧪 Testing

### Unit & Integration Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:cov

# Watch mode
npm run test:watch
```

### Load Testing

```bash
# Install artillery
npm install -g artillery

# Run load test (1000+ tasks/minute)
cd tests
artillery run load-test.yml

# Results show:
# - Response times
# - Error rates
# - Throughput
# - Queue depth over time
```

### Manual Testing with GraphQL Playground

1. Open http://localhost:3000/graphql
2. Get JWT token from `/auth/login` endpoint
3. Add to headers: `{"Authorization": "Bearer YOUR_TOKEN"}`
4. Create & monitor tasks in real-time

---

## 🐳 Docker Deployment

### Scale Workers Horizontally

```bash
# Start 5 workers
docker compose up --scale worker=5

# Start 10 workers
docker compose up --scale worker=10
```

### Production Deployment

```bash
# Build for production
npm run build

# Start with production env
NODE_ENV=production npm run start:prod
```

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for Kubernetes & cloud setup.

---

## 🔧 Development

### Hot-Reload Development

```bash
# Terminal 1: API
npm run start:dev

# Terminal 2: Worker process
npm run worker:dev

# Terminal 3: Scheduler
npm run scheduler:dev
```

### Environment Variables

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=dtq_user
DATABASE_PASSWORD=dtq_pass
DATABASE_NAME=dtq

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRATION=24h

# Worker
WORKER_CONCURRENCY=5
RETRY_ATTEMPTS=3
RETRY_BACKOFF=1000

# App
NODE_ENV=development
APP_PORT=3000
LOG_LEVEL=debug
```

---

## 📦 Tech Stack

| Layer                | Technology                            |
| -------------------- | ------------------------------------- |
| **Runtime**          | Node.js 18+                           |
| **Framework**        | NestJS 10                             |
| **API**              | GraphQL (Apollo Server) + REST (Auth) |
| **Database**         | MySQL 8 (metadata)                    |
| **Cache/Queue**      | Redis 7 (Sorted Sets, Streams)        |
| **Auth**             | JWT + Passport                        |
| **Scheduler**        | node-cron + Luxon                     |
| **Monitoring**       | prom-client + Prometheus              |
| **Testing**          | Jest + Artillery                      |
| **Containerization** | Docker + Docker Compose               |
| **Language**         | TypeScript 5                          |

---

## 🚨 Key Features Explained

### Priority Queuing

Tasks are sorted by priority in Redis Sorted Sets. Higher priority tasks are processed first:

```
PRIORITY | TASK_ID
---------|----------
20       | task-critical-001
10       | task-high-001
5        | task-normal-001
1        | task-low-001
```

### Distributed Locking

Prevents duplicate processing:

```typescript
const hasLock = await redis.set(
  `dtq:lock:${taskId}`,
  "1",
  "EX",
  30, // 30 second TTL
  "NX" // Only if doesn't exist
);
```

### Exponential Backoff Retries

```
Attempt 1: Wait 2^0 * 1000 = 1s
Attempt 2: Wait 2^1 * 1000 = 2s
Attempt 3: Wait 2^2 * 1000 = 4s
Attempt 4: Wait 2^3 * 1000 = 8s → Move to Dead Letter Queue
```

### Recurring Jobs

```graphql
# Daily report at 2 AM
mutation {
  createTask(
    input: {
      name: "daily-report"
      cronExpression: "0 2 * * *" # Cron format
      isRecurring: true
    }
  ) {
    id
  }
}
```

---

## 📚 Documentation

- [Architecture Deep Dive](./docs/ARCHITECTURE.md)
- [GraphQL Schema Reference](./docs/GRAPHQL-SCHEMA.md)
- [API Usage Guide](./docs/API-GUIDE.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Troubleshooting](./docs/TROUBLESHOOTING.md)

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📋 Roadmap

- [ ] Web Dashboard (React + Recharts)
- [ ] Task Webhook Notifications
- [ ] Grafana Dashboard Templates
- [ ] Kubernetes Helm Charts
- [ ] Task Rate Limiting & Burst Handling
- [ ] Multi-tenant Support
- [ ] gRPC Workers (for Go/Rust/Java clients)
- [ ] Task Dependencies & Workflows

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🙋 Support & Questions

- **Issues**: [GitHub Issues](https://github.com/fiyinfoluwa001/DTQ/issues)
- **Discussions**: [GitHub Discussions](https://github.com/fiyinfoluwa001/DTQ/discussions)
- **Email**: support@example.com

---

**Made with ❤️ for distributed teams**
