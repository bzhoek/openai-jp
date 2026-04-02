#!/usr/bin/env deno -W=. -E=OPENAI_API_KEY,OPENAI_BASE_URL,OPENAI_ORG_ID,OPENAI_PROJECT_ID,DEBUG -N=api.openai.com:443,127.0.0.1:8765

import { Command } from "npm:commander";
import { anki_post, complete, insert, speech } from "./lib.ts";

const cli = new Command();
cli
  .description("A CLI for generating Japanese sentences using OpenAI's GPT-4o")
  .version("0.0.1");

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

const simple_sentence = (word: string) => complete(
  `Geef in eenvoudig Japans een herkenbare en specifieke voorbeeldzin, zonder persoonlijk voornaamwoord, met het woord: ${word}. Gebruik één regel voor de Japanse zin en één regel voor de Nederlandse vertaling.`,
);

cli.command("generate")
  .description("Generate simple target sentence with description in details")
  .argument("<query>", "query")
  .action(async (query) => {
    const ids = await anki_post("findNotes", { query: query });
    const notes = await anki_post("notesInfo", { notes: ids.result });
    const results = notes.result.map((note: any) =>
      Object.assign({}, {
        id: note.noteId,
        kanji: note.fields.kanji.value,
        details: note.fields.details.value,
      })
    );
    console.log(results);
    for (const result of results) {
      const completion = await simple_sentence(result.kanji);
      const lines = completion.replace("。", "").split("\n");
      const changes = {
        note: {
          id: result.id,
          fields: {
            target: lines[0],
            details: result.details + lines[0] + "<br>" + lines[1],
          },
        },
      };
      console.log(changes);
      const update = await anki_post("updateNote", changes);
      console.log(update);
    }
  });

function fields(note: any, ...names: string[]) {
  let result: any = Object.assign({}, { id: note.noteId });
  for (const name of names) {
    result[name] = note.fields[name].value;
  }
  return result;
}

async function anki_query(query: string, ...names: string[]) {
  const ids = await anki_post("findNotes", { query: query });
  const notes = await anki_post("notesInfo", { notes: ids.result });
  return notes.result.map((note) => {
    let result: any = Object.assign({}, { id: note.noteId });
    for (const name of names) {
      result[name] = note.fields[name].value;
    }
    return result;
  });
}

import {Document, DOMParser} from "npm:@xmldom/xmldom";
import xpath from "npm:xpath";

function descriptionList(value: string): Document {
  let xml: string  = value
  if(!xml.startsWith("<dl>")) {
    xml = `<dl><dt>${xml}</dt></dl>`;
  }
  console.log(xml);
  return new DOMParser().parseFromString(xml, "text/xml");
}

function textContent(exp: string, doc: Document): [string] {
  const nodes: [Node] = xpath.select(exp, doc);
  return nodes.map((node) => node.textContent)
}

cli.command("translate")
  .description("Add translation to details")
  .option("-f, --force", "Overwrite existing translation")
  .argument("<query>", "query")
  .action(async (query, options) => {
    const results = await anki_query(query, "target", "details");
    console.log(results);

    for (const result of results) {
      const doc = descriptionList(result.target);
      const dt = textContent("/dl/dt", doc);
      const dd = textContent("/dl/dd", doc);
      console.log(dt, dd);
      if (dd.length == 1) {
        if (!options.force) {
          console.log(`Skipping ${result.id} with translation "${dd}"`)
          continue
        }
        console.log(`Overwriting ${result.id} with translation "${dd}"`)
      }

      const translation = await complete(
        `Vertaal in het Nederlands in één beknopte zin: ${result.target}`,
      );
      const changes = {
        note: {
          id: result.id,
          fields: {
            target: `<dl><dt>${dt}</dt><dd>${translation}</dd></dl>`
          },
        },
      };
      console.log(changes);
      const update = await anki_post("updateNote", changes);
      console.log(update);
    }
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
    await insert(words);
  });

cli.parse();
