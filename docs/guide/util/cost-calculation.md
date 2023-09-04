---
sidebar_position: 50
---

# Cost Calculation

Calls to generative models such as OpenAI's API can get expensive quickly. To keep track of your costs and to enable you to understand them, ModelFusion contains cost calculation functionality. You can use it to log the costs of [runs](/guide/util/run) or even implement budgeting that automatically aborts a run when it exceeds a certain cost.

> ⚠️ Cost calculation is currently only supported for OpenAI models. It depends on the current pricing of the API. The cost calculation can be inaccurate when the pricing changes or when there are e.g. aborted calls.

### Example

```ts
// define a run with cost calculators:
const run = new DefaultRun({
  costCalculators: [new OpenAICostCalculator()],
});

const text = await generateText(
  new OpenAITextGenerationModel({
    model: "text-davinci-003",
    temperature: 0.7,
    maxCompletionTokens: 500,
  }),
  "Write a short story about a robot learning to love:\n\n",
  { run } // pass in the run into the model calls
);

// calculate the overall cost of the run:
const cost = await run.calculateCost();

console.log(`Cost: ${cost.formatAsDollarAmount({ decimals: 4 })}`);
```