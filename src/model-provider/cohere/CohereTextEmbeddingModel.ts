import z from "zod";
import {
  createJsonResponseHandler,
  postJsonToApi,
} from "../../internal/postToApi.js";
import { AbstractTextEmbeddingModel } from "../../model/text-embedding/AbstractTextEmbeddingModel.js";
import { TextEmbeddingModelSettings } from "../../model/text-embedding/TextEmbeddingModel.js";
import { RunContext } from "../../run/RunContext.js";
import { TokenizationSupport } from "../../text/tokenize/TokenizationSupport.js";
import { Tokenizer } from "../../text/tokenize/Tokenizer.js";
import { RetryFunction } from "../../util/retry/RetryFunction.js";
import { retryWithExponentialBackoff } from "../../util/retry/retryWithExponentialBackoff.js";
import { ThrottleFunction } from "../../util/throttle/ThrottleFunction.js";
import { throttleUnlimitedConcurrency } from "../../util/throttle/UnlimitedConcurrencyThrottler.js";
import { failedCohereCallResponseHandler } from "./failedCohereCallResponseHandler.js";
import { CohereTokenizer } from "./tokenizer/CohereTokenizer.js";

export const COHERE_TEXT_EMBEDDING_MODELS = {
  "embed-english-light-v2.0": {
    maxTokens: 4096,
    embeddingDimensions: 1024,
  },
  "embed-english-v2.0": {
    maxTokens: 4096,
    embeddingDimensions: 4096,
  },
  "embed-multilingual-v2.0": {
    maxTokens: 4096,
    embeddingDimensions: 768,
  },
};

export type CohereTextEmbeddingModelType =
  keyof typeof COHERE_TEXT_EMBEDDING_MODELS;

export interface CohereTextEmbeddingModelSettings
  extends TextEmbeddingModelSettings {
  model: CohereTextEmbeddingModelType;

  baseUrl?: string;
  apiKey?: string;

  retry?: RetryFunction;
  throttle?: ThrottleFunction;

  truncate?: "NONE" | "START" | "END";
}

/**
 * Create a text embedding model that calls the Cohere Co.Embed API.
 *
 * @see https://docs.cohere.com/reference/embed
 *
 * @example
 * const model = new CohereTextEmbeddingModel({
 *   model: "embed-english-light-v2.0",
 * });
 *
 * const embeddings = await model.embedTexts([
 *   "At first, Nox didn't know what to do with the pup.",
 *   "He keenly observed and absorbed everything around him, from the birds in the sky to the trees in the forest.",
 * ]);
 */
export class CohereTextEmbeddingModel
  extends AbstractTextEmbeddingModel<
    CohereTextEmbeddingResponse,
    CohereTextEmbeddingModelSettings
  >
  implements TokenizationSupport
{
  constructor(settings: CohereTextEmbeddingModelSettings) {
    super({
      settings,
      extractEmbeddings: (response) => response.embeddings,
      generateResponse: (texts, _, run) => this.callAPI(texts, run),
    });

    this.maxTokens = COHERE_TEXT_EMBEDDING_MODELS[this.modelName].maxTokens;
    this.tokenizer = CohereTokenizer.forModel({
      apiKey: this.apiKey,
      model: this.modelName,
    });

    this.embeddingDimensions =
      COHERE_TEXT_EMBEDDING_MODELS[this.modelName].embeddingDimensions;
  }

  readonly provider = "cohere" as const;
  get modelName() {
    return this.settings.model;
  }

  protected readonly maxTextsPerCall = 96;
  readonly embeddingDimensions: number;

  readonly maxTokens: number;
  readonly tokenizer: Tokenizer;

  private get apiKey() {
    const apiKey = this.settings.apiKey ?? process.env.COHERE_API_KEY;

    if (apiKey == null) {
      throw new Error(
        "No Cohere API key provided. Pass an API key to the constructor or set the COHERE_API_KEY environment variable."
      );
    }

    return apiKey;
  }

  private get retry() {
    return this.settings.retry ?? retryWithExponentialBackoff();
  }

  private get throttle() {
    return this.settings.throttle ?? throttleUnlimitedConcurrency();
  }

  async countTokens(input: string) {
    return this.tokenizer.countTokens(input);
  }

  async callAPI(
    texts: Array<string>,
    context?: RunContext
  ): Promise<CohereTextEmbeddingResponse> {
    if (texts.length > this.maxTextsPerCall) {
      throw new Error(
        `The Cohere embedding API only supports ${this.maxTextsPerCall} texts per API call.`
      );
    }

    return this.retry(async () =>
      this.throttle(async () =>
        callCohereEmbeddingAPI({
          abortSignal: context?.abortSignal,
          apiKey: this.apiKey,
          texts,
          ...this.settings,
        })
      )
    );
  }

  withSettings(additionalSettings: Partial<CohereTextEmbeddingModelSettings>) {
    return new CohereTextEmbeddingModel(
      Object.assign({}, this.settings, additionalSettings)
    ) as this;
  }
}

const cohereTextEmbeddingResponseSchema = z.object({
  id: z.string(),
  texts: z.array(z.string()),
  embeddings: z.array(z.array(z.number())),
  meta: z.object({
    api_version: z.object({
      version: z.string(),
    }),
  }),
});

export type CohereTextEmbeddingResponse = z.infer<
  typeof cohereTextEmbeddingResponseSchema
>;

/**
 * Call the Cohere Co.Embed API to generate an embedding for the given input.
 *
 * @see https://docs.cohere.com/reference/embed
 *
 * @example
 * const response = await callCohereEmbeddingAPI({
 *   apiKey: COHERE_API_KEY,
 *   model: "embed-english-light-v2.0",
 *   texts: [
 *     "At first, Nox didn't know what to do with the pup.",
 *     "He keenly observed and absorbed everything around him, from the birds in the sky to the trees in the forest.",
 *   ],
 * });
 */
async function callCohereEmbeddingAPI({
  baseUrl = "https://api.cohere.ai/v1",
  abortSignal,
  apiKey,
  model,
  texts,
  truncate,
}: {
  baseUrl?: string;
  abortSignal?: AbortSignal;
  apiKey: string;
  model: CohereTextEmbeddingModelType;
  texts: string[];
  truncate?: "NONE" | "START" | "END";
}): Promise<CohereTextEmbeddingResponse> {
  return postJsonToApi({
    url: `${baseUrl}/embed`,
    apiKey,
    body: {
      model,
      texts,
      truncate,
    },
    failedResponseHandler: failedCohereCallResponseHandler,
    successfulResponseHandler: createJsonResponseHandler(
      cohereTextEmbeddingResponseSchema
    ),
    abortSignal,
  });
}