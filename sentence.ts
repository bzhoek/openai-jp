#!/usr/bin/env deno -W=. -E=OPENAI_API_KEY,OPENAI_BASE_URL,OPENAI_ORG_ID,OPENAI_PROJECT_ID,DEBUG -N=api.openai.com:443,127.0.0.1:8765

import { Command } from "npm:commander";
import { complete, insert, speech } from "./lib.ts";

let cli = new Command();
cli
  .description("A CLI for generating Japanese sentences using OpenAI's GPT-4o")
  .version("0.0.1");

const additional = `Use one line for the sentence and one line for the translation.`

cli.command("it")
  .description("Intransitive pair of verb")
  .argument("<verb>", "verb")
  .action(async (verb) => {
    const completion = await complete(
      `beantwoord kort of er een intransitieve tegenhanger van ${verb} bestaat`,
    );
    console.log(completion);
  });

cli.command("tt")
  .description("Transitive pair of verb")
  .argument("<verb>", "verb")
  .action(async (verb) => {
    const completion = await complete(
      `beantwoord kort of er een transitieve tegenhanger van ${verb} bestaat`,
    );
    console.log(completion);
  });

cli.command("daily")
  .description("An everyday short sentence")
  .argument("<word>", "word")
  .action(async (word) => {
    const completion = await complete(
      `Give an everyday short sentence in Japanese kanji that uses the word ${word}. ${additional}`,
    );
    console.log(completion);
  });

cli.command("kanjify")
  .description("Rewrite with kanji")
  .argument("<sentence>", "sentence")
  .action(async (sentence) => {
    const completion = await complete(
      `rewrite with kanji ${sentence}`,
    );
    console.log(completion);
  });

cli.command("memo")
  .description("A memorable short sentence")
  .argument("<word>", "word")
  .action(async (word) => {
    const completion = await complete(
      `Suggest a Japanese sentence in kanji that uses the word ${word} in a typical way. ${additional}`,
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

cli.command("split")
  .description("Split sentence into comma-separated words")
  .argument("<sentence>", "sentence")
  .action(async (sentence) => {
    const completion = await complete(
      `Split the sentence "${sentence}" into separate words and only respond with the CSV`,
    );
    console.log(completion);
  });

cli.command("insert")
  .argument("<words>", "sentence")
  .action(async (words) => {
    insert(words);
  });

cli.parse();
