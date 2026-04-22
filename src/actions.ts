// deno-lint-ignore-file no-explicit-any
import {anki_post, anki_query, complete, is_jukugo, to_katakana,} from "./lib.ts";
import {dl, extractXPaths} from "./dom.ts";

export const simple_sentence = (word: string) => complete(
  `Geef in eenvoudig Japans een herkenbare en specifieke voorbeeldzin, zonder persoonlijk voornaamwoord, met het woord: ${word}. Gebruik één regel voor de Japanse zin en één regel voor de Nederlandse vertaling.`,
);

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

export const inbox_notes = async (query: string, options: ApplyOptions) => {
  const results = await anki_query(query);
  for (const result of results) {
    await move_cards(`nid:${result.id}`, "0-Inbox", options);
  }
};

export const move_cards = async (query: string, deck: string, options: ApplyOptions) => {
  const cards = await anki_post("findCards", {query: query});
  if (cards.result) {
    console.log("Matches", cards.result.length, "cards", cards.result);
    const moved = await anki_post("changeDeck", {cards: cards.result, deck: deck}, options.noop);
    if (cards.result.length > 0 && moved && moved.result == null) {
      console.log("Moved", cards.result.length, "cards to", deck);
    }
  }
};

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
    if (completion === null) {
      continue;
    }
    
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
  const results = await anki_query(query, "kana", "kanji", "meaning");

  for (const result of results) {
    let kanji = result.kanji;
    // remove trailing な if also marked in meaning field
    if (result.meaning.includes("な") && kanji.endsWith("な")) {
      kanji = kanji.slice(0, -1);
    }
    
    if (!is_jukugo(kanji)) {
      console.warn("Not jukugo", kanji);
      continue
    }
    
    const matches = result.kana.match(/^([^.]*)(\..*)?$/);
    const kana = matches[1];
    const remainder = matches[2];
    
    let katakana = to_katakana(kana);
    // restore trailing な if also marked in meaning field
    if (result.meaning.includes("な") && kana.endsWith("な")) {
      katakana = katakana.slice(0, -1) + "な";
    }
    katakana += remainder;
    
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
