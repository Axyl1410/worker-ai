import { Hono } from "hono";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/message", (c) => {
  return c.text("Hello Hono!");
});

app.get("/ai", async (c) => {
  const ai = c.env.AI;
  const response = await ai.run("@cf/meta/llama-3.1-8b-instruct-awq", {
    prompt: "what is the capital of France?",
  });

  return c.json(response);
});

export default app;
