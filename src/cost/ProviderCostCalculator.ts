import { SuccessfulModelCall } from "./SuccessfulModelCall.js";

export interface ProviderCostCalculator {
  readonly provider: string;

  /**
   * @return null if the cost is unknown, otherwise the cost in Millicents (0 if free)
   */
  calculateCostInMillicents(options: {
    model: string | null;
    call: SuccessfulModelCall;
  }): PromiseLike<number | null>;
}