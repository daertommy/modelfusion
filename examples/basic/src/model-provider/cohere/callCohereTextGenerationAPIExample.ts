import dotenv from "dotenv";
import { callCohereTextGenerationAPI } from "ai-utils.js";

dotenv.config();

const COHERE_API_KEY = process.env.COHERE_API_KEY ?? "";

(async () => {
  const response = await callCohereTextGenerationAPI({
    apiKey: COHERE_API_KEY,
    model: "command-nightly",
    prompt: "Write a short story about a robot learning to love:\n\n",
    temperature: 0.7,
    maxTokens: 500,
  });

  console.log(response.generations[0].text);
})();