# Distributed Task Queue System

[![NestJS](https://img.shields.io/badge/NestJS-10.x-E0234E?logo=nestjs)](https://nestjs.com/)
[![GraphQL](https://img.shields.io/badge/GraphQL-16.x-E10098?logo=graphql)](https://graphql.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql)](https://www.mysql.com/)
[![Redis](https://img.shields.io/badge/Redis-7.x-DC382D?logo=redis)](https://redis.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-24.x-2496ED?logo=docker)](https://www.docker.com/)

A **production-ready, enterprise-grade** distributed task queue system built with NestJS, GraphQL, MySQL, and Redis. Features real-time subscriptions, distributed locking, worker pools, scheduled jobs, and comprehensive monitoring.

---

## Features

### Core Functionality

- **GraphQL API** with queries, mutations, and real-time subscriptions
- **Distributed Task Queue** powered by BullMQ and Redis
- **MySQL Database** with TypeORM for persistence
- **Worker Pool** with configurable concurrency
- **Scheduled Jobs** using cron expressions
- **Distributed Locking** to prevent duplicate processing
- **Priority Queue** with LOW, NORMAL, HIGH, CRITICAL levels
- **Automatic Retries** with exponential backoff
- **Task Lifecycle** tracking (pending → processing → completed/failed)

### Security & Authentication

- **JWT Authentication** with access and refresh tokens
- **Role-Based Access Control** (User, Admin, Worker)
- **Rate Limiting** to prevent abuse
- **CORS Configuration** for cross-origin requests

### Monitoring & Observability

- **Prometheus Metrics** for queue, worker, and task stats
- **Grafana Dashboards** for visualization
- **Structured Logging** with Winston
- **Health Checks** for all services
- **Performance Tracking** with processing time metrics

### DevOps & Deployment

- **Docker & Docker Compose** for easy setup
- **Multi-stage Docker Build** for optimized images
- **Horizontal Scaling** support for workers
- **Graceful Shutdown** handling
- **Database Migrations** with TypeORM

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         GraphQL Gateway                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │  Queries   │  │ Mutations  │  │Subscriptions│               │
│  └────────────┘  └────────────┘  └────────────┘                │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   Auth   │  │  Tasks   │  │ Workers  │  │Scheduler │       │
│  │ Service  │  │ Service  │  │ Service  │  │ Service  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└────────────┬────────────────────┬────────────────────────────────┘
             │                    │
             ▼                    ▼
┌─────────────────────┐  ┌─────────────────────┐
│   MySQL Database    │  │    Redis Queue       │
│  ┌──────────────┐   │  │  ┌──────────────┐   │
│  │    Users     │   │  │  │ Task Queue   │   │
│  │    Tasks     │   │  │  │ Distributed  │   │
│  │ Worker Logs  │   │  │  │   Locking    │   │
│  └──────────────┘   │  │  └──────────────┘   │
└─────────────────────┘  └─────────────────────┘
             │                    │
             └────────┬───────────┘
                      ▼
            ┌─────────────────────┐
            │   Prometheus         │
            │   Monitoring         │
            └─────────────────────┘
                      │
                      ▼
            ┌─────────────────────┐
            │   Grafana           │
            │   Dashboards        │
            └─────────────────────┘
```

## 🚦 Task Lifecycle

```
┌──────────┐
│ PENDING  │ ────┐
└──────────┘     │
                 ▼
            ┌──────────┐
            │  QUEUED  │
            └──────────┘
                 │
                 ▼
            ┌──────────┐     ┌──────────┐
            │PROCESSING│────▶│ FAILED   │──┐
            └──────────┘     └──────────┘  │
                 │                          │
                 │                          │
                 ▼                          │
            ┌──────────┐                    │
            │COMPLETED │                    │
            └──────────┘                    │
                                            │
            ┌──────────┐                    │
            │CANCELLED │◀───────────────────┘
            └──────────┘
```

### GraphQL Examples

#### 1. Register a User

```graphql
mutation Register {
  register(
    input: {
      email: "user@example.com"
      password: "securepassword"
      name: "John Doe"
    }
  ) {
    accessToken
    user {
      id
      email
      name
      role
    }
  }
}
```

#### 2. Login

```graphql
mutation Login {
  login(input: { email: "user@example.com", password: "securepassword" }) {
    accessToken
    user {
      id
      email
    }
  }
}
```

#### 3. Create a Task

```graphql
mutation CreateTask {
  createTask(
    input: {
      title: "Process Video"
      description: "Convert video to multiple formats"
      priority: HIGH
      payload: { videoId: "abc123", formats: ["720p", "1080p", "4K"] }
    }
  ) {
    id
    title
    status
    priority
    createdAt
  }
}
```

#### 4. Schedule a Future Task

```graphql
mutation ScheduleTask {
  createTask(
    input: {
      title: "Send Newsletter"
      description: "Weekly newsletter"
      priority: NORMAL
      scheduledAt: "2025-12-10T09:00:00Z"
      payload: { recipients: ["user1@example.com", "user2@example.com"] }
    }
  ) {
    id
    title
    scheduledAt
  }
}
```

#### 5. Query Tasks

```graphql
query GetTasks {
  tasks(status: PROCESSING, limit: 10) {
    id
    title
    status
    priority
    attempts
    createdAt
    user {
      email
    }
  }
}
```

#### 6. Get Task Details

```graphql
query GetTask {
  task(id: "task-id-here") {
    id
    title
    description
    status
    priority
    payload
    result
    error
    attempts
    maxRetries
    startedAt
    completedAt
    logs {
      message
      level
      createdAt
    }
  }
}
```

#### 7. Retry Failed Task

```graphql
mutation RetryTask {
  retryTask(id: "task-id-here") {
    id
    status
    attempts
  }
}
```

#### 8. Cancel Task

```graphql
mutation CancelTask {
  cancelTask(id: "task-id-here") {
    id
    status
  }
}
```

#### 9. Get Task Statistics

```graphql
query GetStats {
  taskStats {
    total
    pending
    processing
    completed
    failed
  }
}
```

#### 10. Subscribe to Task Updates (Real-time)

```graphql
subscription TaskUpdates {
  taskUpdated {
    id
    title
    status
    updatedAt
  }
}
```

### Using with Authorization

Add the JWT token to your GraphQL headers:

```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN_HERE"
}
```

### Project Structure

```
src/
├── auth/                 # Authentication & authorization
│   ├── auth.service.ts
│   ├── auth.resolver.ts
│   ├── guards/
│   └── decorators/
├── tasks/               # Task management
│   ├── tasks.service.ts
│   └── tasks.resolver.ts
├── queue/               # Queue & worker logic
│   ├── queue.service.ts
│   └── task.processor.ts
├── scheduler/           # Cron jobs
│   └── scheduler.service.ts
├── metrics/             # Prometheus metrics
│   └── metrics.service.ts
├── prisma/              # Database client
│   └── prisma.service.ts
└── graphql/             # GraphQL schemas & DTOs
    └── dto/
```

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/nestjs-task-queue.git
cd nestjs-task-queue

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start infrastructure services
docker-compose up -d mysql redis prometheus grafana

# Run database migrations (if any)
npm run migration:run

# Start the application
npm run start:dev
```

**Application will be available at:**

- GraphQL Playground: http://localhost:4000/graphql
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin123)

---

## API Documentation

### GraphQL Schema

#### **Queries**

```graphql
# Get a single task
query GetTask {
  task(id: "uuid") {
    id
    name
    status
    priority
    result
    createdAt
  }
}

# Get paginated tasks with filters
query GetTasks {
  tasks(
    filter: { status: PENDING, priority: HIGH }
    pagination: { page: 1, limit: 20, sortBy: "priority", sortOrder: "DESC" }
  ) {
    items {
      id
      name
      status
      priority
    }
    total
    totalPages
    hasNextPage
  }
}

# Get my tasks
query MyTasks {
  myTasks {
    id
    name
    status
    createdAt
  }
}

# Get task statistics (admin only)
query TaskStats {
  taskStats {
    total
    pending
    processing
    completed
    failed
    averageProcessingTime
    successRate
  }
}
```

#### **Mutations**

```graphql
# Create a new task
mutation CreateTask {
  createTask(
    input: {
      name: "Process Video"
      description: "Transcode video to multiple formats"
      priority: HIGH
      payload: {
        videoUrl: "https://example.com/video.mp4"
        formats: ["720p", "1080p", "4K"]
      }
      maxAttempts: 3
    }
  ) {
    id
    name
    status
    priority
  }
}

# Update a task
mutation UpdateTask {
  updateTask(id: "uuid", input: { name: "Updated Name", priority: CRITICAL }) {
    id
    name
    priority
  }
}

# Retry a failed task
mutation RetryTask {
  retryTask(id: "uuid") {
    id
    status
    attempts
  }
}

# Cancel a task
mutation CancelTask {
  cancelTask(id: "uuid") {
    id
    status
  }
}

# Delete a task
mutation DeleteTask {
  deleteTask(id: "uuid")
}

# Bulk delete tasks (admin only)
mutation BulkDelete {
  bulkDeleteTasks(ids: ["uuid1", "uuid2"]) {
    successCount
    failureCount
    successIds
    failureIds
  }
}
```

#### **Subscriptions**

```graphql
# Subscribe to task creation events
subscription OnTaskCreated {
  taskCreated {
    id
    name
    status
    priority
  }
}

# Subscribe to task updates
subscription OnTaskUpdated {
  taskUpdated {
    id
    status
    result
    completedAt
  }
}

# Subscribe to task deletions
subscription OnTaskDeleted {
  taskDeleted
}
```

---

## Configuration

### Environment Variables

```bash
# Application
NODE_ENV=development
PORT=4000

# Database (MySQL)
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=nestjs
DATABASE_PASSWORD=nestjs123
DATABASE_NAME=taskqueue

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=24h

# Queue Configuration
QUEUE_CONCURRENCY=5
QUEUE_MAX_RETRIES=3
QUEUE_RETRY_DELAY=5000

# Worker Configuration
WORKER_ENABLED=true
WORKER_CONCURRENCY=10

# Scheduler
SCHEDULER_ENABLED=true
```

---

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

### Load Testing

```bash
# Using Apache Bench
ab -n 10000 -c 100 \
  -p task_payload.json \
  -T 'application/json' \
  http://localhost:4000/graphql

# Using Artillery
artillery quick --count 100 --num 50 \
  http://localhost:4000/graphql
```

---

## Monitoring

### Prometheus Metrics

Access Prometheus at `http://localhost:9090`

**Available Metrics:**

- `task_queue_length` - Number of tasks in queue
- `task_queue_active` - Active tasks being processed
- `task_processing_duration_seconds` - Task processing time histogram
- `task_status_total` - Total tasks by status
- `worker_jobs_processed_total` - Total jobs processed by workers

### Grafana Dashboards

Access Grafana at `http://localhost:3000` (admin/admin123)

**Sample Queries:**

```promql
# Queue length over time
task_queue_length

# Success rate
rate(task_status_total{status="completed"}[5m]) /
rate(task_status_total[5m])

# Average processing time
rate(task_processing_duration_seconds_sum[5m]) /
rate(task_processing_duration_seconds_count[5m])
```

---

## Deployment

### Docker Compose (Production)

```bash
# Build and start all services
docker-compose up -d --build

# Scale workers
docker-compose up -d --scale app=3

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Kubernetes (Example)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-queue-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: task-queue
  template:
    metadata:
      labels:
        app: task-queue
    spec:
      containers:
        - name: app
          image: task-queue:latest
          ports:
            - containerPort: 4000
          env:
            - name: DATABASE_HOST
              value: mysql-service
            - name: REDIS_HOST
              value: redis-service
```

---

## Security Best Practices

1. **Change default credentials** in production
2. **Use strong JWT secrets** (generate with `openssl rand -base64 32`)
3. **Enable HTTPS/TLS** for production
4. **Implement rate limiting** (already included)
5. **Regular security audits** with `npm audit`
6. **Keep dependencies updated**
7. **Use environment variables** for sensitive data

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [BullMQ](https://docs.bullmq.io/) - Redis-based queue library
- [TypeORM](https://typeorm.io/) - ORM for TypeScript
- [Apollo Server](https://www.apollographql.com/) - GraphQL server
- [Prometheus](https://prometheus.io/) - Monitoring system

---

## Contact

For questions or support:

- Create an issue on GitHub
- Email: boluwatifehonour@gmail.com
- Twitter: [@BoluwatifeOjo10](https://x.com/BoluwatifeOjo10)

---

Made with ❤️ by [Fiyinfoluwa](https://github.com/fiyinfoluwa001)
