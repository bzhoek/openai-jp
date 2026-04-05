// deno-lint-ignore-file no-explicit-any
import {
  anki_post,
  anki_query,
  complete,
  is_jukugo,
  to_katakana,
} from "./lib.ts";
import { descriptionList, textContent } from "./dom.ts";
import { simple_sentence } from "./sentence.ts";

export const generate = async (query: string) => {
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
          target: `<dl><dt>${lines[0].trim()}</dt><dd>${lines[1]}</dd></dl>`,
        },
      },
    };
    console.log(changes);
    const update = await anki_post("updateNote", changes);
    console.log(update);
  }
};

export const hint = async (query: string, options: any) => {
  const results = await anki_query(query, "kanji", "target", "hint");

  for (const result of results) {
    const doc = descriptionList(result.target);
    if (doc === undefined) {
      continue;
    }

    let dt = textContent("/dl/dt", doc);

    if (dt.length > 0 && (result.hint.length === 0 || options.force)) {
      const placeholder = "・".repeat(result.kanji.length);
      const hint = dt.replace(result.kanji, placeholder).replace(/<i>.*/g, "")
        .trim();
      console.log(result.kanji, "hint: ", hint);
      const changes = { note: { id: result.id, fields: { hint: hint } } };
      console.log(changes);
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
    const doc = descriptionList(result.target);
    if (doc === undefined) {
      continue;
    }

    const dt = textContent("/dl/dt", doc);
    const dd = textContent("/dl/dd", doc);
    console.log(dt, dd);
    if (dd.length > 1) {
      if (!options.force) {
        console.log(`Skipping ${result.id} with translation "${dd}"`)
        continue
      }
      console.log(`Overwriting ${result.id} with translation "${dd}"`)
    }

    const changes = {
      note: {
        id: result.id,
        fields: {},
      },
    };
    const details = result.details.split("<br>")
    let translation = "";
    if (result.details.startsWith(dd) && details.length >= 2) {
      translation = result.details.split("<br>")[1];
      Object.assign(changes.note.fields, {details: ""});
    } else {
      console.error("Cannot use details", result.id, result.details);
      translation = await complete(
        `Vertaal in het Nederlands in één beknopte zin: ${result.target}`,
      ) ?? "";
    }

    Object.assign(changes.note.fields, {target: `<dl><dt>${dt}</dt><dd>${translation}</dd></dl>`});
    console.log(changes);
    const update = await anki_post("updateNote", changes, options.noop);
    console.log(update);
  }
}
