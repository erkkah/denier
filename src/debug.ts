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
  const errorStyle = document.createElement("style");
  errorStyle.innerHTML = `denier-error {${boxStyle}}`;
  document.body.appendChild(errorStyle);
}

class Trace {
  constructor(public section: TraceSection, public info: any) {}
}

let traces: Trace[] = [];

export type TraceSection = "node" | "directive";

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

let reported: Error | null = null;

export function debugTraceException(err: any) {
  if (!DEBUG) return;
  if (reported === err) return;
  reported = err;

  console.log("%c🧵 Error rendering template: %s", lineStyle, err.message);

  let lastNode: ChildNode | undefined = undefined;
  const lines: string[] = [];

  for (const trace of traces) {
    if (trace.info instanceof Node) {
      const n = trace.info;
      if (n.isConnected) {
        if (n instanceof Comment && n.textContent?.startsWith("denier-")) {
          lastNode = n as ChildNode;
          lines.push("Component");
        }
      }
    } else {
      lines.push(`[${trace.info}]`);
    }
  }

  if (lastNode) {
    const errorElement = document.createElement("denier-error");
    errorElement.innerHTML = `❌ ${err.message}`;
    if (lastNode instanceof Comment) {
      lastNode.replaceWith(errorElement);
      lastNode = errorElement;
    } else {
      lastNode.after(errorElement);
    }
  }

  console.log("%c🧵 %s", lineStyle, lines.join(" -> "), lastNode ?? "");

  traces = [];
}

export function assert(
  value: unknown,
  message?: string | Error
): asserts value {
  if (!DEBUG) return;
  if (!value) {
    throw new Error(`Failed assertion: ${message ? message : ""}`);
  }
}
