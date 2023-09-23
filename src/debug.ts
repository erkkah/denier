// @ts-ignore
export const DEBUG = process.env.NODE_ENV !== "production";

if (DEBUG) {
  console.log("Denier is running in development mode");
}

interface frame {
  template: string;
  node: Node;
}

const traces: frame[] = [];
let reported: Error | null = null;

export function debugTrace(template: string, node: Node) {
  if (!DEBUG) return;

  const cut = 120;
  let line = template.replace(/\s+/g, " ").substring(0, cut);
  if (template.length > cut) {
    line += "...";
  }
  const prefix = new Array(traces.length + 1).fill("  ").join("");
  traces.push({ template: `${prefix} ${line}`, node });
}

export function popDebugTrace() {
  if (!DEBUG) return;

  traces.pop();
}

export function debugTraceException(err: any) {
  if (!DEBUG) return;
  if (reported === err) return;
  reported = err;

  const current = traces.pop()!;
  traces.push({ ...current, template: "->" + current.template });

  console.debug(`Error while rendering template:`, traces[1].node);
  console.dirxml(traces[1].node);
  console.debug(
    traces
      .map((trace) => `${trace.node.nodeName} - ${trace.template}`)
      .join("\n")
  );
  // console.debug(
  //   `%c${traces.join("\n")}`,
  //   "background: black; color: wheat; white-space: pre;"
  // );
}
