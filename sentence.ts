import OpenAI from "npm:openai";

const word = Deno.args[0];
const openai = new OpenAI();
const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
        {"role": "user", "content": `give an everyday short sentence in japanese that uses the word ${word}`}
    ]
});

console.log(completion.choices[0].message);
