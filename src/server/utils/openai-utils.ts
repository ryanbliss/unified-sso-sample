import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

export async function getIntelligentSuggestionForText(
  text: string
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content:
          "You offer helpful suggestions for how to improve note text. Responses should only include text that you are suggesting as the improvement, completing their sentence, etc.\n\nWays you can offer suggestions:\n- Improve grammar\n- Provide inspiration\n- Complete sentences\n- Flush out ideas\n- Add more items to lists",
      },
      {
        role: "user",
        content:
          'Improve the following note: "I nd to gett som dog fooood, dont forg3t"',
      },
      {
        role: "assistant",
        content: "I need to get some dog food. Don't forget to buy dog food that is healthy for a dog of her size, breed, and unique nutritional needs.",
      },
      {
        role: "user",
        content:
          'I need help with the following note "Such is the meaning of life that I should find meaning in..."',
      },
      {
        role: "assistant",
        content:
          "Such is the meaning of life that I should find purpose in family, community, and serving others.",
      },
      {
        role: "user",
        content: text,
      },
    ],
    temperature: 0.6,
    max_tokens: 1000,
    top_p: 0,
    frequency_penalty: 0,
    presence_penalty: 0,
    n: 1,
  });
  const messageContent = response.choices[0].message.content;
  if (!messageContent) {
    throw new Error("openai-utils offerIntelligentSuggestionForText: response message content is null");
  }
  return messageContent;
}
