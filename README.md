# Distributed Task Queue & Scheduler (DTQ)

**A fault-tolerant, offline-first, priority-aware task queue built for remote teams**

[![Node.js](https://img.shields.io/badge/Node.js-18-green)](https://nodejs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-red)](https://nestjs.com/)
[![Redis](https://img.shields.io/badge/Redis-7-blue)](https://redis.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A **scalable, production-ready** distributed task queue designed for remote and distributed teams. Supports **priority queues**, **exponential retry with dead-letter queue**, **distributed locking**, **offline sync**, **recurring jobs**, **JWT auth**, and **Prometheus monitoring**.

Perfect for scheduling reports, sending notifications, processing uploads — even when workers are offline or network is unstable.

---

### Features

| Feature                     | Status | Description                                             |
| --------------------------- | ------ | ------------------------------------------------------- |
| Priority Queues             | Done   | High-priority tasks jump ahead using Redis Sorted Sets  |
| Fault Tolerance & Retries   | Done   | Exponential backoff + Dead Letter Queue                 |
| Distributed Locking         | Done   | Prevents duplicate processing (`SETNX`)                 |
| Offline-First Workers       | Done   | SQLite local cache + auto-sync when online              |
| Recurring / Scheduled Jobs  | Done   | `node-cron` + Luxon timezone support                    |
| JWT Authentication          | Done   | Admin & Worker roles                                    |
| Health & Prometheus Metrics | Done   | `/health`, `/metrics` (Prometheus-ready)                |
| Horizontal Scaling          | Done   | Scale workers with `docker compose up --scale worker=5` |
| Full Test Suite             | Done   | Unit + Integration + Load tests                         |

---

### Architecture Overview

```
+----------------+     +------------------+     +------------------+
|   Scheduler    |     |      API         |     |     Workers      |
| (node-cron)    | --> | (NestJS + Prisma)| --> | (Redis Consumer) |
+----------------+     +------------------+     +------------------+
                              |    ^                    |
                              |    |                    |
                         PostgreSQL                 Redis (ZSET + Streams)
                              ^    |                    ^
                              |    |                    |
                         Prometheus               SQLite (Offline Cache)
```

---

### Project Structure

```
DTQ/
├── api/                  # NestJS API (Tasks, Auth, Health)
├── worker/               # Task processor with offline sync
├── scheduler/            # Recurring jobs (cron + Luxon)
├── infra/
│   ├── docker-compose.yml
│   └── .env              # Shared environment variables
├── docs/
│   └── postman_collection.json
├── tests/                # Load & stress tests (Artillery)
└── README.md
```

---

### Quick Start (5 minutes)

```bash
#  Clone the repo
git clone https://github.com/yourusername/DTQ.git
cd DTQ

#  Start everything with Docker
cd infra
docker compose up -d

#  Apply database migrations (first time only)
cd ../api
cp .env.example .env
npx prisma migrate dev --name init

# Done! API is running on http://localhost:3000
```

Services:

- API: `http://localhost:3000`
- Redis: `localhost:6379`
- PostgreSQL: `localhost:5432`

---

### API Endpoints

(Planning to migrate to GraphQL)
| Method | Endpoint | Description | Auth |
|-------|-----------------------|--------------------------------|----------|
| POST | `/auth/login` | Get JWT token | Public |
| POST | `/tasks` | Create a task | Admin |
| GET | `/tasks` | List all tasks | Admin |
| POST | `/tasks/sync` | Sync offline tasks | Worker |
| POST | `/workers/register` | Worker heartbeat | Public |
| GET | `/health` | Health check | Public |
| GET | `/metrics` | Prometheus + JSON metrics | Public |

> Full collection: [Postman Collection](./docs/postman_collection.json)

---

### Testing

#### Run Unit & Integration Tests

```bash
cd api
npm test
```

#### Manual Testing (Recommended)

1. Import `docs/postman_collection.json` into Postman
2. Set environment variable: `baseUrl = http://localhost:3000`
3. Login → Create tasks → Watch workers process them!

#### Load Testing (1,000+ tasks)

```bash
cd tests
artillery run load-test.yml
```

#### Scale Workers

```bash
cd infra
docker compose up -d --scale worker=5
```

---

### Monitoring

- **Health**: `GET http://localhost:3000/health`
- **Metrics**: `GET http://localhost:3000/metrics`
  ```text
  # Prometheus format + JSON
  task_queue_depth 12
  task_failures_total 3
  task_throughput_total 842
  ```

Ready for Grafana + Prometheus!

---

### Development

```bash
# Run API locally (hot-reload)
cd api
npm run start:dev

# Run a single worker locally
cd worker
ts-node src/index.ts

# Run scheduler locally
cd scheduler
ts-node src/index.ts
```

---

### Tech Stack Details

| Layer      | Technology                               |
| ---------- | ---------------------------------------- |
| API        | NestJS + TypeScript + Prisma             |
| Queue      | Redis Sorted Sets + Streams              |
| Database   | PostgreSQL (metadata) + SQLite (offline) |
| Auth       | JWT (admin/worker roles)                 |
| Scheduler  | node-cron + Luxon (timezone-aware)       |
| Monitoring | prom-client (Prometheus)                 |
| Container  | Docker + Docker Compose                  |

---

### Future Improvements

- [ ] Web Dashboard (React + Recharts)
- [ ] Task Retry Webhook Notifications
- [ ] Grafana Dashboard Template
- [ ] Kubernetes Deployment
- [ ] Rate Limiting & Burst Handling

---

### Author

**Fiyinfoluwa ❤️**  
Building reliable systems for distributed teams  
[GitHub](https://github.com/fiyinfoluwa001) • [LinkedIn](https://linkedin.com/in/boluwatifeojo)

---

**Star this repo if you found it helpful!**  
Contributions welcome — let's build the best open-source task queue together!
