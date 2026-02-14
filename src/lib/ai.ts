import { createAiGateway } from "ai-gateway-provider";
import { createUnified } from "ai-gateway-provider/providers/unified";

export function createAiProvider(env: CloudflareBindings) {
  const aigateway = createAiGateway({
    accountId: env.ACCOUNT_ID,
    gateway: env.GATEWAY,
    apiKey: env.APIKEY,
  });

  const unified = createUnified();

  return (modelId: string) => aigateway(unified(modelId));
}
