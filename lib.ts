import OpenAI from "npm:openai@4.67.3";
import {Buffer} from "node:buffer";

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

const is_kanji = (char) => char >= '一' && char <= '龘'
const is_hiragana = (char) => char >= 'ぁ' && char <= 'わ' // 0x3041 to 0x308F
const is_katakana = (char) => char >= 'ァ' && char <= 'ワ' // 0x30A1 to 0x30EF

const is_single_kana = (word: string) => word.length === 1 && is_hiragana(word);

export const insert = async (csv: string) => {
  let words = csv
    .split(",")
    .filter((word) => !is_single_kana(word));
  console.log(words)
}
