import { AttributeDirective } from "./directives";
import type * as CSS from "csstype";

class StyleDirective extends AttributeDirective {
    constructor(private style: CSS.Properties | (() => CSS.Properties)) {
        super();
    }

    process(e: HTMLElement): void {
        const style =
            typeof this.style === "function" ? this.style() : this.style;
        Object.assign(e.style, style);
    }
}

export function style<S extends CSS.Properties = CSS.Properties>(
    style: S | (() => S)
): StyleDirective {
    return new StyleDirective(style);
}
