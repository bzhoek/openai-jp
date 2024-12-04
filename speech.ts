// 彼は流行に追随している
//
import fs from "node:fs"
import path from "node:path"
import { Buffer } from "node:buffer"
import OpenAI from "npm:openai"

const sentence = Deno.args[0];
const openai = new OpenAI();

const speechFile = path.resolve("./speech.mp3");

async function main() {
  const mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice: "nova",
    input: sentence,
  });
  console.log(speechFile);
  const buffer = Buffer.from(await mp3.arrayBuffer());
  await fs.promises.writeFile(speechFile, buffer);
}

main();
