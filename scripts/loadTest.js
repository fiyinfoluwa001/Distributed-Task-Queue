const axios = require("axios");

const GRAPHQL_ENDPOINT = "http://localhost:3000/graphql";
const NUM_TASKS = 1000;
const CONCURRENCY = 50;

async function createTask(token, index) {
  try {
    const response = await axios.post(
      GRAPHQL_ENDPOINT,
      {
        query: `
          mutation CreateTask($input: CreateTaskInput!) {
            createTask(input: $input) {
              id
              title
              status
            }
          }
        `,
        variables: {
          input: {
            title: `Load Test Task ${index}`,
            description: `Generated task for load testing`,
            priority: ["LOW", "NORMAL", "HIGH", "CRITICAL"][
              Math.floor(Math.random() * 4)
            ],
            payload: { testData: `data-${index}` },
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error creating task ${index}:`, error.message);
    return null;
  }
}

async function runLoadTest() {
  console.log(
    `Starting load test: Creating ${NUM_TASKS} tasks with concurrency ${CONCURRENCY}`
  );

  // First, login to get token
  const loginResponse = await axios.post(GRAPHQL_ENDPOINT, {
    query: `
      mutation {
        login(input: { email: "test@example.com", password: "password" }) {
          accessToken
        }
      }
    `,
  });

  const token = JSON.parse(loginResponse.data.data.login).accessToken;

  const startTime = Date.now();
  const results = [];

  for (let i = 0; i < NUM_TASKS; i += CONCURRENCY) {
    const batch = [];
    for (let j = 0; j < CONCURRENCY && i + j < NUM_TASKS; j++) {
      batch.push(createTask(token, i + j));
    }
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);

    const progress = (((i + batch.length) / NUM_TASKS) * 100).toFixed(2);
    console.log(`Progress: ${progress}% (${i + batch.length}/${NUM_TASKS})`);
  }

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  const successCount = results.filter((r) => r !== null).length;

  console.log("\n=== Load Test Results ===");
  console.log(`Total tasks: ${NUM_TASKS}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${NUM_TASKS - successCount}`);
  console.log(`Duration: ${duration.toFixed(2)}s`);
  console.log(`Throughput: ${(NUM_TASKS / duration).toFixed(2)} tasks/second`);
}

runLoadTest().catch(console.error);
