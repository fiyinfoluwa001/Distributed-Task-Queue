# Distributed Task Queue & Scheduler

## About
A scalable backend for remote teams to schedule and process tasks with offline sync, priority queues, and fault tolerance.

## Tech Stack
- Node.js / Typescript, NestJS:  Scalable APIs
- Redis Streams: Task queuing
- PosgreSQL/Prisma : Metadata storage
- Docker: Local development

## Setup
1. Clone: `git clone [repo-url]`
2. Install: `cd api && npm install`
3. Env: Copy `.env.example` to `.env`
4. Run: `docker-compose up`