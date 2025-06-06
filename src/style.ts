import { AttributeDirective } from "./directives";
import type * as CSS from "csstype";

class StyleDirective extends AttributeDirective {
  constructor(private style: CSS.Properties | (() => CSS.Properties)) {
    super();
  }

  process(): void {
    const style = typeof this.style === "function" ? this.style() : this.style;
    Object.assign(this.element.style, style);
  }
}

export function style<S extends CSS.Properties = CSS.Properties>(
  style: S | (() => S)
): StyleDirective {
  return new StyleDirective(style);
}

export class DenierStylesheet {
  constructor(
    private strings: TemplateStringsArray,
    private substitutions: any[]
  ) {}

  public code(): string {
    let code = this.strings[0];
    for (let i = 1; i < this.strings.length; i++) {
      const sub = this.substitutions[i - 1];
      if (sub instanceof DenierStylesheet) {
        code += sub.code();
      } else {
        code += sub;
      }
      code += this.strings[i];
    }
    return code;
  }
}

export function css(
  strings: TemplateStringsArray,
  ...substitutions: any[]
): DenierStylesheet {
  return new DenierStylesheet(strings, substitutions);
}
