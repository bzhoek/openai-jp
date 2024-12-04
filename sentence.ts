#!/usr/bin/env deno -W=. -E=OPENAI_API_KEY,OPENAI_BASE_URL,OPENAI_ORG_ID,OPENAI_PROJECT_ID,DEBUG -N=api.openai.com:443
import { Buffer } from "node:buffer";
import { Command } from "npm:commander";
import OpenAI from "npm:openai";

const openai = new OpenAI();
const complete = async (prompt: string) => {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { "role": "user", "content": prompt },
    ],
  });

  return completion.choices[0].message.content;
};

const speech = async (sentence: string, output: string) => {
  const response = await openai.audio.speech.create({
    model: "tts-1",
    voice: "nova",
    input: sentence,
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  await Deno.writeFile(output, buffer);
};

let cli = new Command();
cli
  .description("A CLI for generating Japanese sentences using OpenAI's GPT-4o")
  .version("0.0.1");

cli.command("everyday")
  .description("An everyday short sentence")
  .argument("<word>", "word")
  .action(async (word) => {
    const completion = await complete(
      `Give an everyday short sentence in Japanese that uses the word ${word}`,
    );
    console.log(completion);
  });

cli.command("memorable")
  .description("A memorable short sentence")
  .argument("<word>", "word")
  .action(async (word) => {
    const completion = await complete(
      `Give a memorable short sentence in Japanese with the word ${word}`,
    );
    console.log(completion);
  });

cli.command("speech")
  .description("Save sentence as audio")
  .argument("<sentence>", "sentence")
  .requiredOption("-o, --output <file>", "output file")
  .action(async (sentence, opts) => {
    await speech(sentence, opts.output);
    console.log(`Wrote ${sentence} to ${opts.output}`);
  });

cli.parse();
