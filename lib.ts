// deno-lint-ignore-file
import OpenAI from "npm:openai";
import {Buffer} from "node:buffer";
import {delay} from "jsr:@std/async/delay";
import {Semaphore} from "jsr:@std/async/unstable-semaphore";

const openai = new OpenAI();

export async function anki_query(query: string, ...names: string[]) {
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

export const complete = async (prompt: string) => {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { "role": "user", "content": prompt },
    ],
  });

  return completion.choices[0].message.content;
};

export const speech = async (sentence: string, output: string) => {
  const response = await openai.audio.speech.create({
    model: "tts-1",
    voice: "nova",
    input: sentence,
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  await Deno.writeFile(output, buffer);
};

const semaphore = new Semaphore(2);
export const anki_post = async (action: string, params: any, noop = false, retries = 3, delay_ms = 1000) => {
  if (noop) {
    console.log(`No-op "${action}" with params ${JSON.stringify(params)}`);
    return;
  }

  let request = {
    action: action,
    version: 6,
    params: params
  }

  // console.debug(request)
  await semaphore.acquire();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      let res = await fetch('http://127.0.0.1:8765', {method: 'post', body: JSON.stringify(request)})
      return res.json()
    } catch (err) {
      console.warn(`${err} encountered. Retry ${attempt}/${retries}...`);
      await delay(delay_ms);
    } finally {
      semaphore.release();
    }
  }
}

const post = async (action: string, params: any) => {
  const request = {
    action: action,
    version: 6,
    params: params,
  };

  await delay();
  return fetch("http://127.0.0.1:8765", {
    method: "post",
    body: JSON.stringify(request),
  }).then((res) => res.json());
};

async function note_info(id: string) {
  const rsp = await post("notesInfo", { notes: [id] });
  return rsp.result[0];
}

const find_notes = async (query: string) => {
  const rsp = await post("findNotes", { query: query });
  return rsp.result;
};

const find_yomi_first = async (kanji: string) => {
  const rsp = await find_notes(
    `(note:OnYomi or note:KunYomi or note:Godan or note:Ichidan) kanji:${kanji}`,
  );
  return rsp[0];
};

const find_yomi_note = async (kanji: string) => {
  const rsp = await find_notes(
    `(note:OnYomi or note:KunYomi or note:Godan or note:Ichidan) kanji:${kanji}`,
  );
  const first = rsp[0];
  return await note_info(first);
};

const is_kanji = (char: string) => char >= "一" && char <= "龘";
const is_hiragana = (char: string) => char >= "ぁ" && char <= "わ"; // 0x3041 to 0x308F
const is_katakana = (char: string) => char >= "ァ" && char <= "ワ"; // 0x30A1 to 0x30EF

const is_single_kana = (word: string) => word.length === 1 && is_hiragana(word);
const is_all_kana = (word: string) => Array.from(word).filter(is_hiragana).length === word.length;
const is_all = (word: string, filter) => Array.from(word).filter(filter).length === word.length;
const is_all_kanji = (word: string) => is_all(word, is_kanji);

export const insert = async (csv: string) => {
  const words = csv
    .split(",")
    .filter((word) => is_all_kanji(word));
  console.log("non-kana", words);

  for (const word of words) {
    const id = await find_yomi_first(word);
    if (id === undefined) {
      console.log(`No note found for ${word}`);
      const target = csv.replace(",", "");
      const placeholder = '・'.repeat(word.length);
      const hint = target.replace(word, placeholder);
      console.log(`Try searching for ${hint}`);
      const add = {
        "note": {
          "deckName": "0-Inbox",
          "modelName": "OnYomi",
          "fields": {
            "nederlands": "nederlands",
            "kanji": word,
            "on": "json.katakana.join(', ')",
            "dictionary": "json.meanings.join(', ') + '\n' + json.hiragana.join(', ')",
            "strokes": "css_style + svg",
            "target": target,
            "hint": hint
          },
          "options": {
            "allowDuplicate": false
          },
          "tags": "tags"
        }
      }
      console.log(add)
      post('addNote', add).then(json => {
        console.log("added", word, json)
      })
    } else {
      console.log(`Found note ${id} for ${word}`);
    }
  }
};
