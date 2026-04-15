// deno-lint-ignore-file no-explicit-any
import {anki_post, anki_query, complete, is_jukugo, to_katakana,} from "./lib.ts";
import {dl, extractXPaths} from "./dom.ts";
import {simple_sentence} from "./sentence.ts";

export type ApplyOptions = {
  force: boolean;
  noop: boolean;
};

// use existing google speech generation
export const generate_speech = async (query: string, options: any) => {
  const results = await anki_query(query, "target", "context");

  for (const result of results) {
    const doc = extractXPaths(dl(result.target), {dt: "/dl/dt"});
    if (doc === undefined || doc.dt.length < 2) {
      console.log("Skipping empty target:", result.target);
      continue;
    }
  }
}

export const generate_target = async (query: string, options: ApplyOptions) => {
  const results = await anki_query(query, "kanji", "target");
  for (const result of results) {
    const doc = extractXPaths(dl(result.target), {dd: "/dl/dd"});
    if (doc && doc.dd.length > 1) {
      if (!options.force) {
        console.log("Skipping existing target:", result.target);
        continue;
      }
      console.log("Forcing new target:", result.target);
    }

    const completion = await simple_sentence(result.kanji);
    const lines = completion.replace("。", "").split("\n");
    const changes = {
      note: {
        id: result.id,
        fields: {
          target: `<dl><dt>${lines[0].trim()}</dt><dd>${lines[1]}</dd></dl>`,
        },
      },
    };
    console.log("Changes:", changes);
    await anki_post("updateNote", changes, options.noop);
  }
};

export const hint = async (query: string, options: any) => {
  const results = await anki_query(query, "kanji", "target", "hint");

  for (const result of results) {
    const doc = extractXPaths(dl(result.target), {dt: "/dl/dt"});
    if (doc === undefined) {
      console.error("Cannot parse:", result.target);
      continue;
    }

    if (doc.dt.length > 0 && (result.hint.length === 0 || options.force)) {
      const placeholder = "・".repeat(result.kanji.length);
      const hint = doc.dt.replace(result.kanji, placeholder).replace(/<i>.*/g, "")
        .trim();
      console.log("Kanji:", result.kanji, "hint: ", hint);
      const changes = { note: { id: result.id, fields: { hint: hint } } };
      console.log("Changes:", changes);
      await anki_post("updateNote", changes, options.noop);
    }
  }
};

export const onyomi = async (query: string, options: any) => {
  const results = await anki_query(query, "kana", "kanji");

  for (const result of results) {
    if (!is_jukugo(result.kanji)) {
      continue
    }
    let katakana = to_katakana(result.kana);
    if (katakana != result.kana || options.force) {
      const changes = { note: { id: result.id, fields: { kana: katakana } } };
      console.log(changes);
      await anki_post("updateNote", changes, options.noop);
    }
  }
};

export const translate = async (query: string, options: any) => {
  const results = await anki_query(query, "target", "details");

  for (const result of results) {
    const doc = extractXPaths(dl(result.target), {dt: "/dl/dt", dd: "/dl/dd"});
    if (doc === undefined) {
      continue;
    }

    console.log(doc);
    if (doc.dd.length > 1) {
      if (!options.force) {
        console.log("Skipping", result.id, "with translation", doc.dd)
        continue
      }
      console.log("Overwriting", result.id, "with translation", doc.dd)
    }

    const changes = {
      note: {
        id: result.id,
        fields: {},
      },
    };
    const details = result.details.split("<br>")
    let translation = "";
    if (result.details.startsWith(doc.dd) && details.length >= 2) {
      translation = result.details.split("<br>")[1];
      Object.assign(changes.note.fields, {details: ""});
    } else {
      console.error("Cannot use details", result.id, result.details);
      translation = await complete(
        `Vertaal in het Nederlands in één beknopte zin: ${result.target}`,
      ) ?? "";
    }

    Object.assign(changes.note.fields, {target: `<dl><dt>${doc.dt}</dt><dd>${translation}</dd></dl>`});
    console.log(changes);
    const update = await anki_post("updateNote", changes, options.noop);
    console.log(update);
  }
}
