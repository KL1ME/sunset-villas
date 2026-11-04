const origin = "http://127.0.0.1:5174";
let lastStatus = 'No HTTP response';
for (let attempt = 0; attempt < 60; attempt++) {
  try {
    const response = await fetch(origin + "/api/admin", {signal:AbortSignal.timeout(2000)});
    lastStatus = `HTTP ${response.status}`;
    if (response.status === 401) process.exit(0);
  } catch { lastStatus = 'Connection failed'; }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
throw new Error(
  `Local backend did not become ready (${lastStatus}). See /tmp/sunset-backend.log.`,
);
