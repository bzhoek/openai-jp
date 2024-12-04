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