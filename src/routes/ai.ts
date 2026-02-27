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
  const model = getProvider("workers-ai/@cf/meta/llama-3.1-8b-instruct");

  const userQuery = c.req.query("query") ?? "information about copper and lead";

  const searchResult = await c.env.AI.autorag("fancy-brook-3022").search({
    query: userQuery,
    rewrite_query: true,
  });

  if (searchResult.data.length === 0) {
    const result = streamText({
      model,
      system: `
      You are a helpful assistant. Explain clearly to the user that no relevant data was found in the current knowledge base for their query, and suggest that they try rephrasing or asking a different question.
      `,
      prompt: `No data found for query: "${userQuery}". Please let the user know there is currently no matching information in the knowledge base for this query.`,
      maxOutputTokens: 512,
      experimental_transform: smoothStream(),
    });

    return result.toTextStreamResponse({
      headers: {
        "Content-Type": "text/x-unknown",
        "content-encoding": "identity",
        "transfer-encoding": "chunked",
      },
    });
  }

  // Join all document chunks into a single string
  const chunks = searchResult.data
    .map((item) => {
      let data = item.content
        .map((content) => {
          return content.text;
        })
        .join("\n\n");

      data = data
        // 1. Remove image tags ![]()
        .replace(/!\[[^\]]*\]\([^)]+\)/g, "")

        // 2. [IMPORTANT] Recover material name from URL for empty links (e.g. [](/wiki/items/3-graphite) -> Graphite)
        .replace(
          /\[\s*\]\([^)]*\/[0-9]+-([a-zA-Z0-9-]+)\/?\)/g,
          (_match, itemName) => {
            // Capitalize the first letter and replace dashes with spaces (3-phase-fabric -> Phase fabric)
            return (
              itemName.charAt(0).toUpperCase() +
              itemName.slice(1).replace(/-/g, " ")
            );
          }
        )

        // 3. Keep the text of links that contain characters, remove the URL
        .replace(/\[([^\]]*)\]\([^)]+\)/g, "$1")

        // 4. Remove "Skip to content" text
        .replace(/Skip to content/gi, "")

        // 5. Remove redundant menu entries
        .replace(
          /^\s*\*\s*(Modding Classes|Blocks|Items|Liquids|Logic|Modding|Planets|Statuses|Units|Servers|Data Patches|Frequently Asked Questions|Glossary|Writing and Editing Code|Variables and Constants|Plugins & JVM Mods|Scripting|Spriting|Markup|Types|[0-9]\.0 Migration Guide).*$/gm,
          ""
        )

        // 6. Remove extra whitespace and blank lines
        .replace(/[ \t]+$/gm, "")
        .replace(/[ \t]{2,}/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      return `<file name="${item.filename}">\n${data}\n</file>`;
    })
    .join("\n\n");

  console.log(chunks);

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
  // return Response.json({ chunks });
});

export default app;
