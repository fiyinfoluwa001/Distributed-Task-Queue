# Manual Testing Guide

This file is gitignored — it exists only on your machine and will never be committed.

---

## Recommended client: Altair GraphQL Client

Use **Altair** — it is purpose-built for GraphQL, handles WebSocket subscriptions natively, lets you save collections of queries, and has a clean variable/header editor.

**Download:** https://altairgraphql.dev  
Available as a desktop app (Mac/Windows/Linux) or a Chrome/Firefox browser extension. Either works.

Other acceptable options:
- **Hoppscotch** (https://hoppscotch.io) — web-based, no install, also handles subscriptions
- **GraphQL Playground** — already built into the app at `http://localhost:3000/graphql`, good for quick one-off queries but does NOT support subscriptions in newer versions
- **Insomnia** — supports GraphQL but subscription support is inconsistent

---

## Before you start — get the app running

Run these in order. Each one must succeed before the next.

```bash
# 1. Start MySQL and Redis
docker compose -f infra/docker-compose.yml up -d mysql redis

# 2. Wait ~10 seconds for MySQL health checks, then generate the Prisma client
npm run prisma:generate

# 3. Create the database tables (first time only — type "init" when prompted)
npm run prisma:migrate

# 4. Start the app
npm run start:dev
```

You should see this in the terminal:
```
Application is running on: http://localhost:3000
GraphQL Playground:        http://localhost:3000/graphql
Bull Board (queue UI):     http://localhost:3000/queues
Prometheus metrics:        http://localhost:3000/metrics
```

If you see that, the app is ready. Open Altair and continue.

---

## Altair setup

1. Open Altair
2. Set the endpoint URL to: `http://localhost:3000/graphql`
3. Leave everything else at defaults for now

For subscriptions you will need to change the endpoint to the WebSocket URL — we cover that in the Subscriptions section.

---

## Section 1 — Authentication

All task operations require a JWT token. You must register or log in first and then add the token to every request header.

### 1.1 Register a new user

Paste this in Altair and click **Send**:

```graphql
mutation Register {
  register(input: {
    email: "alice@example.com"
    password: "password123"
    name: "Alice"
  }) {
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

**Expected response:**
```json
{
  "data": {
    "register": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "some-uuid",
        "email": "alice@example.com",
        "name": "Alice",
        "role": "USER"
      }
    }
  }
}
```

Copy the `accessToken` value. You will need it in every request after this.

---

### 1.2 Add the token to Altair headers

In Altair:
1. Click the **Headers** tab (or the header icon)
2. Add a new header:
   - **Key:** `Authorization`
   - **Value:** `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` ← paste your token after `Bearer `
3. Every query/mutation you send from now on will include this header automatically

---

### 1.3 Verify the token works — query the current user

```graphql
query Me {
  me {
    id
    email
    name
    role
  }
}
```

**Expected:** returns your user object. If you get `Unauthorized`, your token is missing or wrong.

---

### 1.4 Log in (if you already have an account)

Use this if you've already registered and just need a fresh token:

```graphql
mutation Login {
  login(input: {
    email: "alice@example.com"
    password: "password123"
  }) {
    accessToken
    user {
      id
      email
      role
    }
  }
}
```

---

### 1.5 Test wrong password (error scenario)

```graphql
mutation LoginWrongPassword {
  login(input: {
    email: "alice@example.com"
    password: "wrongpassword"
  }) {
    accessToken
  }
}
```

**Expected:** GraphQL error with `Unauthorized` message. This should NOT return a token.

---

## Section 2 — Creating tasks

### 2.1 Create a basic task (queued immediately)

```graphql
mutation CreateBasicTask {
  createTask(input: {
    title: "My first task"
    description: "Testing task creation"
    priority: NORMAL
  }) {
    id
    title
    status
    progress
    priority
    attempts
    maxRetries
    createdAt
  }
}
```

**Expected status:** `QUEUED` — the task goes straight into the BullMQ queue since there is no `scheduledAt`.

**What to check next:**
- Open `http://localhost:3000/queues` in your browser
- You should see the `tasks` queue with 1 active or completed job
- Click the job to see its full payload, result, and timing

---

### 2.2 Create tasks with each priority level

Run each of these one by one and watch Bull Board — higher priority tasks jump the queue:

```graphql
mutation LowPriority {
  createTask(input: { title: "Low priority task", priority: LOW }) {
    id title priority status
  }
}
```

```graphql
mutation CriticalPriority {
  createTask(input: { title: "Critical task", priority: CRITICAL }) {
    id title priority status
  }
}
```

**Priority order in BullMQ (lower number = processed first):**
- `CRITICAL` → 1
- `HIGH` → 2
- `NORMAL` → 3
- `LOW` → 4

---

### 2.3 Create a task with a JSON payload

The `payload` field accepts any JSON object. This is the data your worker receives and acts on:

```graphql
mutation CreateTaskWithPayload {
  createTask(input: {
    title: "Process video"
    description: "Transcode to multiple formats"
    priority: HIGH
    payload: {
      videoId: "abc123"
      formats: ["720p", "1080p", "4K"]
      outputBucket: "s3://my-bucket/videos"
    }
  }) {
    id
    title
    payload
    status
  }
}
```

After the task completes, query it by ID and check the `result` field — it will contain what `executeTask()` returned.

---

### 2.4 Schedule a task for the future

```graphql
mutation ScheduleFutureTask {
  createTask(input: {
    title: "Future newsletter"
    priority: NORMAL
    scheduledAt: "2026-12-25T09:00:00Z"
    payload: { listId: "weekly-subscribers" }
  }) {
    id
    title
    status
    scheduledAt
  }
}
```

**Expected status:** `PENDING` (not `QUEUED`) — the scheduler cron will pick it up at or after `scheduledAt`.

To test the scheduler immediately without waiting: change `scheduledAt` to a timestamp 30 seconds in the future, wait for it, then query the task — you should see it transition to `QUEUED` then `PROCESSING` then `COMPLETED`.

---

## Section 3 — Querying tasks

### 3.1 List all your tasks

```graphql
query ListAllTasks {
  tasks {
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

---

### 3.2 Filter by status

```graphql
query ListCompletedTasks {
  tasks(status: COMPLETED, limit: 10) {
    id
    title
    status
    completedAt
  }
}
```

Valid status values: `PENDING` `QUEUED` `PROCESSING` `COMPLETED` `FAILED` `CANCELLED`

---

### 3.3 Get a single task with full details

First copy a task `id` from a previous response, then:

```graphql
query GetTaskDetails {
  task(id: "PASTE-TASK-ID-HERE") {
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
    user {
      email
    }
    logs {
      message
      level
      createdAt
    }
  }
}
```

The `logs` array shows exactly what the worker did — each step is logged. The `result` field shows the JSON the worker returned on success. The `error` field shows the error message on failure.

---

### 3.4 Task statistics

```graphql
query Stats {
  taskStats {
    total
    pending
    processing
    completed
    failed
  }
}
```

---

### 3.5 Queue health (live BullMQ counts from Redis)

```graphql
query QueueHealth {
  queueHealth {
    waiting
    active
    completed
    failed
  }
}
```

Note: these numbers come from Redis directly (BullMQ) and may differ slightly from `taskStats` which reads MySQL.

---

## Section 4 — Modifying tasks

### 4.1 Cancel a task

Only works on tasks that are NOT already `COMPLETED`.

```graphql
mutation CancelTask {
  cancelTask(id: "PASTE-TASK-ID-HERE") {
    id
    status
  }
}
```

**Expected:** `status: "CANCELLED"`

**Error scenario** — try cancelling a completed task:
```graphql
mutation CancelCompletedTask {
  cancelTask(id: "ID-OF-A-COMPLETED-TASK") {
    id
    status
  }
}
```
**Expected:** GraphQL error: `Cannot cancel completed task`

---

### 4.2 Retry a failed task

Tasks fail occasionally (the worker has a 10% random failure rate built in for testing). To force one to fail, wait for a task that naturally hits the error, or create several tasks and wait.

Once you have a `FAILED` task ID:

```graphql
mutation RetryFailedTask {
  retryTask(id: "PASTE-FAILED-TASK-ID-HERE") {
    id
    status
    attempts
  }
}
```

**Expected:** `status: "QUEUED"`, `attempts` stays the same (retry increments it when processing starts).

**Error scenario** — retry a task that's not failed:
```graphql
mutation RetryNonFailedTask {
  retryTask(id: "ID-OF-A-COMPLETED-TASK") {
    id
    status
  }
}
```
**Expected:** GraphQL error: `Can only retry failed tasks`

---

### 4.3 Update a task (admin only)

This requires an account with the `ADMIN` role. Regular `USER` accounts will get a Forbidden error.

To test the forbidden error with your current user:
```graphql
mutation UpdateTaskAsUser {
  updateTask(id: "PASTE-TASK-ID-HERE", input: { title: "New title" }) {
    id
    title
  }
}
```
**Expected:** Forbidden / 403 error (your account is `USER` role)

To actually use this mutation you need to manually update your user's role in MySQL:
```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'alice@example.com';
```
Then log in again to get a fresh token with the new role embedded.

---

## Section 5 — Real-time subscriptions

Subscriptions use WebSockets, not HTTP. You need to change the Altair connection type.

### 5.1 Set up the WebSocket connection in Altair

1. In Altair, click the **Subscriptions** icon or go to the subscription settings
2. Change the subscription URL to: `ws://localhost:3000/graphql`
3. Set the subscription type to **`graphql-ws`** (NOT `subscriptions-transport-ws` — that's the old protocol)
4. Save

---

### 5.2 Subscribe to all new tasks

Open a **new Altair tab** (you need the HTTP tab open separately for mutations):

```graphql
subscription WatchNewTasks {
  taskCreated {
    id
    title
    status
    priority
    createdAt
  }
}
```

Click **Subscribe**. The tab will show "Listening...".

Now go to your other Altair tab and run `CreateBasicTask` from Section 2.1.

**Expected:** The subscription tab immediately shows the new task appear in real-time without you refreshing anything.

---

### 5.3 Subscribe to task status and progress updates (all tasks)

```graphql
subscription WatchAllUpdates {
  taskUpdated {
    id
    title
    status
    progress
    result
    error
    completedAt
  }
}
```

Create a task and watch it move through `QUEUED` → `PROCESSING` → `COMPLETED` in real time.
While the task is `PROCESSING`, you will see multiple subscription events fire with increasing `progress` values: **10 → 50 → 90 → 100**.
Each milestone is persisted to MySQL, so `task(id: "...")` will also return the current `progress` at any time.

---

### 5.4 Subscribe to updates for a specific user only

The `userId` filter means this subscriber only receives events for tasks belonging to that user:

```graphql
subscription WatchMyTasks {
  taskUpdated(userId: "PASTE-YOUR-USER-ID-HERE") {
    id
    title
    status
    updatedAt
  }
}
```

To get your user ID: run the `Me` query from Section 1.3 and copy the `id` field.

**Test the filter:** Register a second user account in another tab, create tasks with that second user, and verify that the subscription above does NOT fire for those tasks.

---

## Section 6 — Bull Board (queue UI)

This is a plain web page — open it in your browser, no GraphQL client needed.

**URL:** `http://localhost:3000/queues`

### What to look for

| Tab | What it shows |
|-----|---------------|
| **Waiting** | Jobs in Redis ready to be picked up by a worker |
| **Active** | Jobs currently running inside `TaskProcessor` |
| **Completed** | Jobs that finished successfully (click one to see the result JSON) |
| **Failed** | Jobs that failed after all retries (click one to see the error and stack trace) |
| **Delayed** | Jobs scheduled for a future `scheduledAt` time |

### Actions you can take from the UI

- **Retry** a failed job — click the job → Retry button
- **Promote** a delayed job — makes it run immediately instead of waiting
- **Clean** a queue — removes all completed or failed jobs from Redis (does NOT affect MySQL)
- **Pause / Resume** the queue — stops workers from picking up new jobs (useful during deployments)

### Tip: watch a task flow through in real time

1. Open Bull Board in one browser tab
2. In Altair, create a new task with `createTask`
3. Refresh Bull Board — you should see the job appear in **Active** briefly, then move to **Completed**
4. Click the completed job to see the `result` JSON that `executeTask()` returned

---

## Section 7 — Prometheus metrics

**URL:** `http://localhost:3000/metrics`

Open this in your browser — it returns plain text (Prometheus exposition format). You don't need any client.

### Key metrics to look for

Search (`Ctrl+F`) for these in the page:

| Metric | What it means |
|--------|---------------|
| `tasks_created_total` | Total tasks created, broken down by priority label |
| `tasks_completed_total` | Total tasks that completed successfully |
| `tasks_failed_total` | Total tasks that failed |
| `tasks_active` | Current number of tasks in `PROCESSING` state |
| `queue_size` | Current BullMQ queue depth |
| `task_duration_seconds_bucket` | Histogram of task execution times |

### Verify metrics update

1. Note the current value of `tasks_created_total`
2. Create 3 tasks via Altair
3. Refresh `/metrics`
4. `tasks_created_total` should have increased by 3

---

## Section 8 — Webhook & email notifications

Tasks support two optional notification fields you supply at creation time.

### 8.1 Webhook notification

Use a free webhook inspector like **https://webhook.site** to get a unique URL, then create a task with that URL:

```graphql
mutation CreateTaskWithWebhook {
  createTask(input: {
    title: "Webhook test"
    webhookUrl: "https://webhook.site/YOUR-UNIQUE-ID"
  }) {
    id
    title
    webhookUrl
  }
}
```

**What to expect:**
- Once the task completes (or fails), the app sends an HTTP POST to your webhook URL
- Switch to the webhook.site tab — you should see a request arrive with this JSON body:
  ```json
  {
    "event": "task.completed",
    "taskId": "...",
    "status": "COMPLETED",
    "result": { ... },
    "error": null,
    "timestamp": "..."
  }
  ```
- If the task fails, `event` will be `"task.failed"` and `error` will contain the message

### 8.2 Email notification

Add SMTP credentials to your `.env` file first:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@your-app.com
```

> For Gmail, generate an **App Password** (Google Account → Security → 2-Step Verification → App passwords). Do not use your main Gmail password.

Then create a task with `notifyEmail`:

```graphql
mutation CreateTaskWithEmail {
  createTask(input: {
    title: "Email test"
    notifyEmail: "recipient@example.com"
  }) {
    id
    title
    notifyEmail
  }
}
```

**What to expect:**
- The recipient receives an email with subject `Task "Email test" completed` (or `failed`)
- The body includes the task result (or error message)
- If SMTP is not configured (vars are empty), the email step is silently skipped — no error

### 8.3 Both at once

You can set both fields on the same task — they are independent and use `Promise.allSettled`, so a webhook failure does not block the email (and vice versa).

---

## Section 9 — Full end-to-end flow test

Run this sequence in order to exercise every part of the system at once:

```
1. Register a new user                          → get accessToken
2. Set Authorization header in Altair
3. Open Bull Board in browser (localhost:3000/queues)
4. Open a subscription tab, subscribe to taskUpdated
5. Create a CRITICAL priority task with payload
6. Watch: Bull Board shows it Active, then Completed
7. Watch: subscription tab fires with the update
8. Query the task by ID — check result field is populated, logs have entries
9. Create a LOW priority task
10. Create another CRITICAL task immediately after
11. Watch Bull Board: CRITICAL processes before LOW
12. Check /metrics — tasks_created_total increased by 3
13. Create a task and immediately cancel it — verify status = CANCELLED
14. Wait for a task to naturally fail (10% chance each run)
    OR create many tasks until one fails
15. Retry the failed task — verify it goes back to QUEUED
16. Check taskStats query — numbers match what you created
```

---

## Common issues

**"Unauthorized" on every request**
→ Check the Authorization header is exactly `Bearer <token>` with a space, not `Bearer:<token>`
→ Tokens expire after 1 day — run the Login mutation to get a fresh one

**Subscriptions not receiving events**
→ Make sure Altair is using `graphql-ws` protocol, not the legacy `subscriptions-transport-ws`
→ The subscription URL must be `ws://` not `http://`
→ Make sure the subscription tab is still showing "Listening..." before you send mutations

**Task stays PENDING and never moves to QUEUED**
→ The task has a future `scheduledAt` — wait for the scheduler cron (runs every minute)
→ Or check the app logs for scheduler errors

**Bull Board shows nothing / blank page**
→ Make sure the app is running (`npm run start:dev`)
→ Try hard-refreshing the browser (`Ctrl+Shift+R`)

**Task fails immediately with "Simulated task failure"**
→ This is intentional — `TaskProcessor.executeTask()` randomly fails 10% of the time
→ Retry the task or create a new one

**"Cannot cancel completed task" error**
→ Expected — cancellation is blocked on completed tasks by design

**Prisma client not found error on app start**
→ Run `npm run prisma:generate` then restart the app
