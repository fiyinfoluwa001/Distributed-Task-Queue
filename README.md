# Distributed Task Queue System

A distributed task queue system built with **NestJS + GraphQL + MySQL + Redis + BullMQ**. Tasks are submitted via a GraphQL API, persisted in MySQL, queued in Redis, and processed by workers with distributed locking, automatic retries, and real-time subscription updates.

## Table of Contents

- [How It Works](#how-it-works)
- [Quick Start](#quick-start)
- [Available Scripts](#available-scripts)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Testing](#testing)
- [GraphQL API](#graphql-api)
- [Monitoring](#monitoring)
- [Docker Deployment](#docker-deployment)
- [Project Structure](#project-structure)

## How It Works

```
Client (GraphQL)
      │
      ▼
 TasksResolver  ──► TasksService ──► MySQL (Prisma)
                         │
                         ▼
                    QueueService ──► Redis (BullMQ)
                                         │
                                         ▼
                                   TaskProcessor
                                  (acquires Redis lock,
                                   updates task status,
                                   releases lock)
```

**Task lifecycle:** `PENDING` → `QUEUED` → `PROCESSING` (progress 0→100) → `COMPLETED` / `FAILED`

- A task created with a future `scheduledAt` stays `PENDING` until the `SchedulerService` cron picks it up every minute.
- Workers use a 300-second Redis lock per task to prevent duplicate processing across multiple instances.
- Failed tasks auto-retry with exponential backoff up to `maxRetries`. Stuck tasks (processing > 15 min) are detected and reset every 10 minutes.
- Real-time updates are pushed to subscribers via **Redis PubSub** (works correctly across multiple app instances).

## Quick Start

### Prerequisites

- **Node.js 20** (`.nvmrc` is set; run `nvm use` if you have nvm)
- **Docker & Docker Compose** (for MySQL, Redis, Prometheus, Grafana)
- **npm**

### 1. Clone and install

```bash
git clone https://github.com/fiyinfoluwa001/Distributed-Task-Queue.git
cd Distributed-Task-Queue
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
# Edit .env if you need to change any defaults — the defaults match the Docker Compose setup
```

### 3. Start infrastructure (MySQL + Redis)

```bash
docker compose -f infra/docker-compose.yml up -d mysql redis
```

Wait about 10 seconds for MySQL to finish its health checks, then:

### 4. Set up the database

```bash
# Generate the Prisma client (TypeScript types for the DB models)
npm run prisma:generate

# Push the schema to MySQL and create the tables
npm run prisma:migrate
# When prompted for a migration name, type something like: init
```

> **First time only:** if you just want to sync schema without creating a named migration (e.g. local dev), use `npm run prisma:push` instead.

### 5. Start the app

```bash
npm run start:dev
```

The app starts on port **3000**:

| Endpoint           | URL                           |
| ------------------ | ----------------------------- |
| GraphQL Playground | http://localhost:3000/graphql |
| Bull Board (queue UI) | http://localhost:3000/queues |
| Prometheus metrics | http://localhost:3000/metrics |

## Available Scripts

```bash
# Development
npm run start:dev        # Start with ts-node (no build step needed)
npm run build            # Compile TypeScript to dist/
npm run start            # Run the compiled output from dist/

# Testing
npm test                 # Run all unit tests
npm run test:watch       # Watch mode — reruns tests on file changes
npm run test:cov         # Run tests and generate a coverage report
npm run test:e2e         # Run end-to-end tests (requires running DB + Redis)

# Database (Prisma)
npm run prisma:generate  # Regenerate the Prisma client after schema changes
npm run prisma:migrate   # Create and apply a new migration (dev)
npm run prisma:push      # Sync schema directly without a migration file (dev only)
```

## Database

This project uses **Prisma** with **MySQL**. The schema lives in `prisma/schema.prisma`. The generated client is output to `src/generated/prisma/` (this is what `@prisma/client` resolves to via the tsconfig path alias).

### Common database workflows

```bash
# After pulling changes that modified prisma/schema.prisma:
npm run prisma:generate   # Regenerate types
npm run prisma:migrate    # Apply any new migrations

# After changing the schema yourself:
npm run prisma:migrate    # Creates a SQL migration file + applies it
npm run prisma:generate   # Regenerate client types

# Inspect the database with a GUI:
npx prisma studio
```

### Models

| Model       | Description                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------- |
| `User`      | Registered users. Roles: `ADMIN`, `USER`, `WORKER`                                                |
| `Task`      | The core entity. Stores status, priority, payload (JSON), result (JSON), progress (0-100), retry counts, timestamps |
| `WorkerLog` | Audit log entries written by the processor for each task it handles                               |

## Testing

Tests are written with **Jest + ts-jest** using a TDD approach. All external dependencies (Prisma, Redis, BullMQ) are mocked in unit tests — you do not need a running database or Redis to run `npm test`.

```bash
npm test                  # Run all unit tests (53 tests across 9 suites)
npm run test:watch        # Watch mode
npm run test:cov          # Generate HTML coverage report in ./coverage
```

### Run a single test file

```bash
npx jest src/tasks/tasks.service.spec.ts
npx jest src/queue/task.processor.spec.ts
```

### Run tests matching a name pattern

```bash
npx jest --testNamePattern="should set task status to FAILED"
```

### Test files

| File                                      | What it covers                                                                          |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| `src/auth/auth.service.spec.ts`           | Register, login, wrong password, user not found                                         |
| `src/auth/auth.resolver.spec.ts`          | Resolver returns real objects (not JSON strings), correct arg forwarding                |
| `src/tasks/tasks.service.spec.ts`         | Task creation, queue enqueue, metrics                                                   |
| `src/tasks/tasks.resolver.spec.ts`        | Mutations publish events, subscription userId filter                                    |
| `src/queue/queue.service.spec.ts`         | Priority mapping, scheduling delay, Redis lock acquire/release, queue health            |
| `src/queue/task.processor.spec.ts`        | Lock acquisition, PROCESSING/COMPLETED/FAILED status transitions, lock always released  |
| `src/scheduler/scheduler.service.spec.ts` | Scheduled task pickup, partial failure resilience, 30-day cleanup, stuck task detection |
| `src/metrics/metrics.service.spec.ts`     | Counter/gauge/histogram method delegation                                               |
| `src/pubsub/pubsub.service.spec.ts`       | Uses RedisPubSub (not in-memory), publish/asyncIterator delegation                      |

### E2E tests

E2E tests in `test/tasks.e2eSpec.ts` hit the real GraphQL endpoint and require MySQL + Redis to be running.

```bash
# Make sure infrastructure is up first:
docker compose -f infra/docker-compose.yml up -d mysql redis

npm run test:e2e
```

## Monitoring

Start Prometheus and Grafana alongside the app:

```bash
docker compose -f infra/docker-compose.yml up -d prometheus grafana
```

| Service    | URL                   | Credentials       |
| ---------- | --------------------- | ----------------- |
| Prometheus | http://localhost:9090 | —                 |
| Grafana    | http://localhost:3001 | `admin` / `admin` |

### Prometheus metrics exposed at `/metrics`

| Metric                  | Type      | Description                           |
| ----------------------- | --------- | ------------------------------------- |
| `tasks_created_total`   | Counter   | Tasks created, labeled by `priority`  |
| `tasks_completed_total` | Counter   | Tasks successfully completed          |
| `tasks_failed_total`    | Counter   | Tasks that failed                     |
| `tasks_active`          | Gauge     | Tasks currently in `PROCESSING` state |
| `queue_size`            | Gauge     | Current BullMQ queue depth            |
| `task_duration_seconds` | Histogram | End-to-end processing time            |

### Sample PromQL queries

```promql
# Task creation rate by priority
rate(tasks_created_total[5m])

# Success rate over the last 5 minutes
rate(tasks_completed_total[5m]) / rate(tasks_created_total[5m])

# Average processing duration
rate(task_duration_seconds_sum[5m]) / rate(task_duration_seconds_count[5m])
```

## Docker Deployment

The Docker Compose file is in `infra/`. All services share a private `dtq-network`.

### Start everything

```bash
docker compose -f infra/docker-compose.yml up -d --build
```

This starts: `app` (port 3000), `mysql` (port 3306), `redis` (port 6379), `prometheus` (port 9090), `grafana` (port 3001).

### Scale workers horizontally

Because distributed Redis locking prevents duplicate processing, you can safely run multiple app instances:

```bash
docker compose -f infra/docker-compose.yml up -d --scale app=3
```

Real-time subscriptions continue to work across instances because `PubSubService` routes events through Redis pub/sub.

### Useful commands

```bash
# View live logs
docker compose -f infra/docker-compose.yml logs -f app

# Run a Prisma migration against the containerised DB
docker compose -f infra/docker-compose.yml exec app npx prisma migrate deploy

# Stop everything (preserves volumes)
docker compose -f infra/docker-compose.yml down

# Stop and delete all data volumes
docker compose -f infra/docker-compose.yml down -v
```

### Required environment variable for production

`JWT_SECRET` is not set in the Compose file and must be provided:

```bash
JWT_SECRET=$(openssl rand -base64 32) docker compose -f infra/docker-compose.yml up -d
```

Or add it to a `.env` file in the project root (Docker Compose picks it up automatically).

## Project Structure

```
.
├── infra/
│   ├── docker-compose.yml        # Local / production compose file
│   └── prometheus.yml            # Prometheus scrape config
├── prisma/
│   └── schema.prisma             # Database schema (source of truth)
├── src/
│   ├── app.module.ts             # Root NestJS module
│   ├── main.ts                   # App entry point
│   ├── auth/                     # JWT auth: register, login, guards, decorators
│   ├── tasks/                    # Task CRUD: resolver, service, tests
│   ├── queue/                    # BullMQ producer (QueueService) + consumer (TaskProcessor)
│   ├── scheduler/                # Cron jobs: scheduled task pickup, stuck task recovery, cleanup
│   ├── pubsub/                   # Redis PubSub wrapper for GraphQL subscriptions
│   ├── metrics/                  # Prometheus counters, gauges, histograms
│   ├── prisma/                   # PrismaService singleton
│   ├── graphql/                  # schema.gql, DTOs, custom scalars (DateTime, JSON)
│   └── generated/prisma/         # Auto-generated Prisma client (do not edit manually)
└── test/
    └── tasks.e2eSpec.ts          # End-to-end tests
```

**Key relationships:**

- `TasksResolver` → `TasksService` (business logic) → `PrismaService` (DB) + `QueueService` (Redis)
- `TaskProcessor` (BullMQ consumer) → `PrismaService` + `QueueService` (for the distributed lock)
- `SchedulerService` → `PrismaService` + `QueueService` (cron-driven task dispatch)
- `PubSubService` wraps `RedisPubSub` — both `TasksResolver` (publishes) and subscription methods (subscribes) use it

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-change`
3. Write your tests first, then implement
4. Verify everything passes: `npm test`
5. Open a pull request

## Contact

- GitHub Issues: https://github.com/fiyinfoluwa001/Distributed-Task-Queue/issues
- Email: boluwatifehonour@gmail.com
