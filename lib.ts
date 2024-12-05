import OpenAI from "npm:openai";
import { Buffer } from "node:buffer";

const openai = new OpenAI();

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

function delay() {
  return new Promise((resolve) => setTimeout(resolve, 300));
}

const post = async (action: string, params) => {
  let request = {
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
  let rsp = await post("notesInfo", { notes: [id] });
  return rsp.result[0];
}

const find_notes = async (query: string) => {
  let rsp = await post("findNotes", { query: query });
  return rsp.result;
};

const find_yomi_first = async (kanji: string) => {
  let rsp = await find_notes(
    `(note:OnYomi or note:KunYomi or note:Godan or note:Ichidan) kanji:${kanji}`,
  );
  let first = rsp[0];
  return first;
};

const find_yomi_note = async (kanji: string) => {
  let rsp = await find_notes(
    `(note:OnYomi or note:KunYomi or note:Godan or note:Ichidan) kanji:${kanji}`,
  );
  let first = rsp[0];
  return await note_info(first);
};

const is_kanji = (char: string) => char >= "一" && char <= "龘";
const is_hiragana = (char: string) => char >= "ぁ" && char <= "わ"; // 0x3041 to 0x308F
const is_katakana = (char: string) => char >= "ァ" && char <= "ワ"; // 0x30A1 to 0x30EF

const is_single_kana = (word: string) => word.length === 1 && is_hiragana(word);
const is_all_kana = (word: string) =>
  Array.from(word).filter((ch) => is_hiragana(ch)).length === word.length;

export const insert = async (csv: string) => {
  let words = csv
    .split(",")
    .filter((word) => !is_all_kana(word));
  console.log("non-kana", words);

  for (const word of words) {
    let id = await find_yomi_first(word);
    if (id === undefined) {
      console.log(`No note found for ${word}`);
      let hint = csv.replace(word, `(${word})`);
      console.log(`Try searching for ${hint}`);
      let add = {
        "note": {
          "deckName": "0-Inbox",
          "modelName": "OnYomi",
          "fields": {
            "nederlands": "nederlands",
            "kanji": word,
            "on": "json.katakana.join(', ')",
            "dictionary": "json.meanings.join(', ') + '\n' + json.hiragana.join(', ')",
            "strokes": "css_style + svg"
          },
          "options": {
            "allowDuplicate": false
          },
          "tags": "tags"
        }
      }
      console.log(add)
      // post('addNote', add).then(json => {
      //   console.log("added", word, json)
      // })
    } else {
      console.log(`Found note ${id} for ${word}`);
    }
  }
};
