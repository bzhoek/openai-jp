#!/usr/bin/env deno -W=. -E=OPENAI_API_KEY,OPENAI_BASE_URL,OPENAI_ORG_ID,OPENAI_PROJECT_ID,OPENAI_WEBHOOK_SECRET,OPENAI_LOG,DEBUG,CLICOLOR_FORCE -N=api.openai.com:443,127.0.0.1:8765

import {Command} from "npm:commander";
import {complete, insert, speech} from "./src/lib.ts";
import {
  ApplyOptions,
  generate_speech,
  generate_target,
  hint, inbox_notes, move_cards,
  onyomi,
  simple_sentence,
  translate
} from "./src/actions.ts";

const cli = new Command();
cli
  .description("A CLI for generating Japanese sentences using OpenAI's GPT-4o")
  .version("0.0.1");

const only_noop: ApplyOptions = {force: false, noop: true};
const force_noop: ApplyOptions = {force: true, noop: true};

function query_apply(cli: Command, command: string, description: string, action: (...args: any[]) => void, options: ApplyOptions = force_noop): Command {
  const subcmd = cli.command(command)
  subcmd
    .description(description)
    .option("-n, --noop", "Non-destructive dry-run")
    .argument("<query>", "query")
    .action(action)
  if (options.force) {
    subcmd.option("-f, --force", "Overwrite existing translation")
  }
  return subcmd
}

query_apply(cli, "inbox", "Move cards of matching notes to Inbox", inbox_notes, only_noop);
query_apply(cli, "move", "Move cards to deck", move_cards, only_noop)
  .argument("<deck>", "Target deck")

query_apply(cli, "generate", "Generate target sentence as definition list", generate_target);
query_apply(cli, "hint", "Create hint from target", hint);
query_apply(cli, "onyomi", "Convert hiragana to katakana", onyomi);
query_apply(cli, "speech", "Add speech from target in context", generate_speech);
query_apply(cli, "translate", "Add translation to target as definition", translate);

const additional = `Use one line for the sentence and one line for the translation.`;

cli.command("it")
  .description("Intransitive pair of verb")
  .argument("<verb>", "verb")
  .action(async (verb) => {
    const completion = await complete(
      `beantwoord met ja of nee of er een 自動詞 van ${verb} bestaat en wat dat woord is`,
    );
    console.log(completion);
  });

cli.command("tt")
  .description("Transitive pair of verb")
  .argument("<verb>", "verb")
  .action(async (verb) => {
    const completion = await complete(
      `beantwoord met ja of nee of er een 他動詞 van ${verb} bestaat en wat dat woord is`,
    );
    console.log(completion);
  });

cli.command("daily")
  .description("An everyday short sentence")
  .argument("<word>", "word")
  .action(async (word) => {
    const completion = await complete(
      `Give an everyday short sentence (without pronouns) in Japanese kanji that uses the word ${word} in a common way. ${additional}`,
    );
    console.log(completion);
  });

cli.command("memo")
  .description("A memorable short sentence")
  .argument("<word>", "word")
  .action(async (word) => {
    const completion = await complete(
      `Suggest a short and memorable Japanese sentence (without pronouns) with kanji that uses the word ${word} in a typical way. ${additional}`,
    );
    console.log(completion);
  });

cli.command("simple")
  .description("A simple sentence")
  .argument("<word>", "word")
  .action(async (word) => {
    const completion = await simple_sentence(word);
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

cli.command("tts")
  .description("Save sentence as audio")
  .argument("<sentence>", "sentence")
  .requiredOption("-o, --output <file>", "output file")
  .action(async (sentence, opts) => {
    await speech(sentence, opts.output);
    console.log("Wrote", sentence, "to", opts.output);
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
    await insert(words);
  });

cli.parse();
