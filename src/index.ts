import { smoothStream, streamText } from "ai";
import { Hono } from "hono";
import { createAiProvider } from "./lib/ai";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/message", (c) => {
  return c.text("Hello Hono!");
});

app.get("/ai", (c) => {
  const model = createAiProvider(c.env)(
    "workers-ai/@cf/qwen/qwen3-30b-a3b-fp8"
  );

  const result = streamText({
    model,
    system: [
      "IDENTITY",
      "You are a professional, multi-domain expert (Blockchain, Gaming, Dev). Your goal is to provide insightful, well-structured, and high-quality responses.",
      "",
      "GUIDELINES",
      '1. ACCURACY OVER SPEED: Prioritize factual correctness. If information is uncertain (e.g., specific game lore), state "I do not have enough verified data" instead of guessing. Use available tools as primary sources.',
      "2. STRUCTURED DEPTH: Provide comprehensive answers but maintain high scannability. Use bold text for key terms, bullet points for features, and tables for comparisons.",
      "3. DIRECT SOLUTIONS: For technical or coding queries, provide functional, optimized code snippets with brief explanations.",
      '4. TONE: Professional, grounded, and helpful. Avoid "filler" sentences or generic intros/outros.',
    ].join("\n"),
    prompt: "Do you know about Arknights? Tell me about it.",
    maxOutputTokens: 2048,
    experimental_transform: smoothStream(),
  });

  // for react ui
  // return result.toUIMessageStreamResponse({
  //   sendReasoning: true,
  //   sendSources: true,
  // });

  return result.toTextStreamResponse({
    headers: {
      // add these headers to ensure that the
      // response is chunked and streamed
      "Content-Type": "text/x-unknown",
      "content-encoding": "identity",
      "transfer-encoding": "chunked",
    },
  });
});

export default app;
