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

  const cut = 1024;
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

function prettyLine(line: string): string {
  return line.replace(
    /(<div )?denier-([^=]+)="([^"]+)"(><\/div>)?/g,
    (_, prefix, id, kind, suffix) => {
      const [aore, op] = kind.split(":");
      if (aore == "a") {
        return (prefix ?? "") + op + (suffix ?? "");
      }
      return `[${op}]`;
    }
  );
}

export function debugTraceException(err: any) {
  if (!DEBUG) return;
  if (reported === err) return;
  reported = err;

  const current = traces.pop()!;
  traces.push({ ...current, template: "->" + current.template });
  console.debug(`Error while rendering template:`, current.node);
  console.debug(
    "%c" + traces.map((trace) => `${prettyLine(trace.template)}`).join("\n"),
    "background: black; color: wheat; white-space: pre;"
  );
}
