const origin = "http://127.0.0.1:5174";
for (let attempt = 0; attempt < 60; attempt++) {
  try {
    const response = await fetch(origin + "/api/admin");
    if (response.status === 401) process.exit(0);
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
throw new Error(
  "Local backend did not become ready. See /tmp/sunset-backend.log.",
);
