// @ts-ignore
export const DEBUG = process.env.NODE_ENV !== "production";

const lineStyle = DEBUG
  ? `
display: inline-block;
font: 12px/1.5 monospace;
font-weight: bold;
background: yellow;
color: black;
padding: 1px 8px;
`
  : "";

const boxStyle = DEBUG
  ? `
  ${lineStyle}
border-radius: 6px;
padding: 4px 8px;
border: 4px solid red;
`
  : "";

if (DEBUG) {
  console.log("%c🧵 Denier is running in development mode!", boxStyle);
}

class Trace {
  constructor(public section: TraceSection, public info: any) {}
}

let traces: Trace[] = [];

export type TraceSection = "template" | "node" | "directive";

export function debugTraceBegin(section: TraceSection, info: any) {
  if (!DEBUG) return;
  traces.push(new Trace(section, info));
}

export function debugTraceEnd(section: TraceSection) {
  if (!DEBUG) return;
  const top = traces.pop();
  if (top?.section !== section) {
    throw new Error("Inconsistent trace call");
  }
}

export function debugTraceUpdateNode(from: Element, to: Element) {
  if (!DEBUG) return;
  if (!to) {
    return;
  }
  for (const trace of traces) {
    if (trace.info === from) {
      trace.info = to;
    }
  }
}

let reported: Error | null = null;

export function debugTraceException(err: any) {
  if (!DEBUG) return;
  if (reported === err) return;
  reported = err;

  console.log("%c🧵 Error rendering template: %s", lineStyle, err.message);

  let lastNode: ChildNode | undefined = undefined;
  const lines: string[] = [];

  for (const trace of traces) {
    if (trace.info instanceof Element) {
      const e = trace.info;
      if (e.isConnected) {
        lines.push(
          e.tagName + (e.id && !e.id.startsWith("denier-") ? `:${e.id}` : "")
        );
        lastNode = e;
      }
    } else {
      lines.push(`[${trace.info}]`);
    }
  }

  if (lastNode) {
    const errorElement = document.createElement("div");
    errorElement.id = "denier-error";
    errorElement.insertAdjacentHTML(
      "afterbegin",
      `
      <style>
        #denier-error {
          ${boxStyle}
        }
      </style>
      <error>
        ${err.message}
      </error>
    `
    );
    lastNode.replaceWith(errorElement);
    lastNode = errorElement;
  }

  console.log("%c🧵 %s", lineStyle, lines.join(" -> "), lastNode ?? "");

  traces = [];
}

export function assert(value: unknown, message?: string | Error): asserts value {
  if (!DEBUG) return;
  if (!value) {
    throw new Error(`Failed assertion: ${message ? message : ""}`);
  }
}
