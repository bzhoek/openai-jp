import {Document, DOMParser} from "xmldom";
import xpath from "xpath";

export function dl(value: string): string {
  if (value.startsWith("<dl>")) {
    return value;
  }
  return `<dl><dt>${value}</dt></dl>`;
}

export function extractXPaths(xml: string, keys: any): any | undefined {
  try {
    const doc =  new DOMParser().parseFromString(xml, "text/xml");
    const result = {};
    for (const [key, value] of Object.entries(keys)) {
      Object.assign(result, { [key]: textContent(value, doc) });
    }
    return result;
  } catch (e) {
    console.error(xml, e.message || e);
    return undefined;
  }
}

export function textContent(exp: string, doc: Document): string {
  const nodes: [Node] = xpath.select(exp, doc);
  return nodes.map((node) => node.textContent)[0]?.trim() ?? "";
}
