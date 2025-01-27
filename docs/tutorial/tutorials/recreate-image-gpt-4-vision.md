---
sidebar_position: 22
---

# Recreate images using GPT-4 Vision and Dall-E 3

You can use a combination of multi-modal text generation models and image generation models to recreate an image in a new style.

This tutorial demonstrates how to recreate an image in a cyberpunk style using OpenAI GPT 4 Vision and Dall-E 3. It involves generating a text prompt that captures the essence of the original image and then creating a new image in the desired style using AI models.

:::note
To use the OpenAI GPT-4 Vision with ModelFusion, you need to have an [OpenAI API key](https://platform.openai.com/) and access to the `gpt-4-vision-preview` model.
:::

First we need to obtain the image that we want to recreate. This involves fetching the image from a URL and converting it into a Base64 string.

```ts
const imageResponse = await fetch(imageUrl);
const base64Image = Buffer.from(await imageResponse.arrayBuffer()).toString(
  "base64"
);
```

After obtaining the base image, the next step is to create an image generation prompt using GPT 4 Vision. This prompt will instruct Dall-E 3 to generate a description for creating a cyberpunk-style version of the original image.

```ts
const imageGenerationPrompt = await generateText(
  openai
    .ChatTextGenerator({
      model: "gpt-4-vision-preview",
      maxCompletionTokens: 128,
    })
    .withInstructionPrompt(),
  {
    instruction: [
      {
        type: "text",
        text:
          "Generate an image generation prompt for creating a cyberpunk-style image " +
          "that resembles the attached image. " +
          "Capture the essence of the image in 1-2 sentences.",
      },
      { type: "image", base64Image },
    ],
  }
);

console.log(`Image generation prompt:`);
console.log(imageGenerationPrompt);
```

Dall-E 3 will interpret the prompt and create a new image in the specified cyberpunk style.

```ts
const image = await generateImage(
  openai.ImageGenerator({
    model: "dall-e-3",
    quality: "hd",
    size: "1024x1024",
  }),
  imageGenerationPrompt
);
```

Once the recreated image has been generated, the last step is to save it to disk.

```ts
const path = `./enhanced-image-example.png`;
fs.writeFileSync(path, image);

console.log(`Image saved to ${path}`);
```

In summary, this tutorial demonstrates a simple yet powerful way to use AI for transforming images into new styles, combining GPT-4 Vision and Dall-E 3 using ModelFusion. You can use the same approach to recreate images in other styles, such as watercolor paintings or pencil sketches.

## References

- [Source Code](https://github.com/lgrammel/modelfusion/blob/main/examples/basic/src/tutorials/recreate-image-gpt4-vision.ts)
