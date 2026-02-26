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

app.get("/test", async (c) => {
  // 1. Lấy câu hỏi từ URL query, ví dụ: /test?q=What is a router?
  // Nếu không có param, dùng câu hỏi mặc định để test
  const userQuery = c.req.query("q") || "What is a router in Mindustry?";

  const getProvider = createAiProvider(c.env);
  const model = getProvider("workers-ai/@cf/qwen/qwen3-30b-a3b-fp8");

  // 2. Nhúng (embed) trực tiếp câu hỏi vì không có lịch sử chat
  const embeddingResults = await c.env.AI.run("@cf/baai/bge-large-en-v1.5", {
    text: [userQuery],
  });

  // 3. Truy vấn Vectorize
  const matches = await c.env.VECTORIZE.query(embeddingResults.data[0], {
    topK: 5,
    returnMetadata: "all",
  });

  // 4. Định dạng Context
  const retrievedContext = matches.matches
    .filter((match) => match.score > 0.4)
    .map((match) => {
      return `${match.metadata?.name}: ${match.metadata?.text}
      
      Source: ${match.metadata?.url}`;
    })
    .join("\n\n");

  // 5. Cấu hình System Prompt
  const systemPrompt = `
    IDENTITY
    You are a professional chatbot specialized in the factory simulation game Mindustry. Your goal is to provide insightful, well-structured, and high-quality responses strictly about in-game content.

    GUIDELINES
    1. ACCURACY OVER SPEED: Prioritize factual correctness. You MUST treat the content in <context> as your primary source of truth.
    2. NO HALLUCINATIONS: If the information is not in the context, state "I do not have enough verified data" or "Mình không chắc lắm".
    3. SCOPE LIMIT: Only answer questions related to the Mindustry game (mechanics, blocks, units, logic, strategies, maps, etc.). For anything outside Mindustry, respond with "This assistant only answers questions about the game Mindustry."

    <context>
    ${retrievedContext || "No external context found for this query."}
    </context>
  `;

  // 6. Stream kết quả
  const result = streamText({
    model,
    system: systemPrompt,
    prompt: userQuery,
    maxOutputTokens: 2048,
    experimental_transform: smoothStream(),
  });

  // Dùng toTextStreamResponse để văn bản trả về stream thẳng lên tab trình duyệt (dễ đọc hơn so với Data Stream của Next.js)
  return result.toTextStreamResponse({
    headers: {
      "Content-Type": "text/x-unknown",
      "content-encoding": "identity",
      "transfer-encoding": "chunked",
    },
  });
});

export default app;
