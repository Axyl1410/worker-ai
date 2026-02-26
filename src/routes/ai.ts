import { smoothStream, streamText } from "ai";
import { Hono } from "hono";
import { createAiProvider } from "../lib/ai";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/", (c) => {
  const getProvider = createAiProvider(c.env);
  const model = getProvider("workers-ai/@cf/qwen/qwen3-30b-a3b-fp8");

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

  return result.toTextStreamResponse({
    headers: {
      "Content-Type": "text/x-unknown",
      "content-encoding": "identity",
      "transfer-encoding": "chunked",
    },
  });
});

app.get("/", (c) => {
  const getProvider = createAiProvider(c.env);
  const model = getProvider("workers-ai/@cf/qwen/qwen3-30b-a3b-fp8");

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

  return result.toTextStreamResponse({
    headers: {
      "Content-Type": "text/x-unknown",
      "content-encoding": "identity",
      "transfer-encoding": "chunked",
    },
  });
});

app.get("/test", async (c) => {
  const getProvider = createAiProvider(c.env);
  const model = getProvider("workers-ai/@cf/ibm-granite/granite-4.0-h-micro");

  const userQuery = c.req.query("query") ?? "information about copper and lead";

  const searchResult = await c.env.AI.autorag("fancy-brook-3022").search({
    query: userQuery,
  });

  if (searchResult.data.length === 0) {
    // No matching documents
    return Response.json({ text: `No data found for query "${userQuery}"` });
  }

  // Join all document chunks into a single string
  const chunks = searchResult.data
    .map((item) => {
      const data = item.content
        .map((content) => {
          return content.text;
        })
        .join("\n\n");

      return `<file name="${item.filename}">${data}</file>`;
    })
    .join("\n\n");

  const result = streamText({
    model,
    system: `
    IDENTITY
    You are a professional chatbot specialized in the factory simulation game Mindustry.

    GUIDELINES
    1. ACCURACY OVER SPEED: Prioritize factual correctness. You MUST treat the content in <context> as your primary source of truth.
    2. NO HALLUCINATIONS: If the information is not in the context, state "I do not have enough verified data".
    3. SCOPE LIMIT: Only answer questions related to the Mindustry game (mechanics, blocks, units, logic, strategies, maps, etc.). For anything outside Mindustry, respond with "This assistant only answers questions about the game Mindustry."
  `,
    prompt: `Use the following information to answer the question:
    <context>
    ${chunks}
    </context>
    <question>
    ${userQuery}
    </question>`,
    maxOutputTokens: 2048,
    experimental_transform: smoothStream(),
  });

  return result.toTextStreamResponse({
    headers: {
      "Content-Type": "text/x-unknown",
      "content-encoding": "identity",
      "transfer-encoding": "chunked",
    },
  });
});

export default app;
