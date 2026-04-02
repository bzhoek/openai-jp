import {Document, DOMParser} from "npm:@xmldom/xmldom";
import xpath from "npm:xpath";

export function descriptionList(value: string): Document {
  let xml: string  = value
  if(!xml.startsWith("<dl>")) {
    xml = `<dl><dt>${xml}</dt></dl>`;
  }
  console.log(xml);
  return new DOMParser().parseFromString(xml, "text/xml");
}

export function textContent(exp: string, doc: Document): string {
  const nodes: [Node] = xpath.select(exp, doc);
  return nodes.map((node) => node.textContent)[0] ?? "";
}
