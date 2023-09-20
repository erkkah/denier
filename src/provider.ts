import { AttributeDirective, Constructor, ElementDirective } from "./directives";
import { DenierTemplate, DenierComponent } from "./template";

type DenierContext = Record<string, unknown>;
type DenierContextHolder = Element & { _denierContext?: DenierContext };

function getContext(e: Element): DenierContext {
    const holder = e as DenierContextHolder;
    if (!holder._denierContext) {
        holder._denierContext = {};
    }
    return holder._denierContext;
}

function hasContext(e: Element): boolean {
    return '_denierContext' in e;
}

class Provider<T extends Object> extends AttributeDirective {
    private _value: T;

    constructor(value: T | (() => T)) {
        super();
        this._value = (typeof value === "function") ? value() : value;
    }

    override process(e: Element): void {
        const context = getContext(e);
        const type = this._value.constructor.name;
        context[type] = this._value;
    }
}

export function provide<T extends Object>(value: T | (() => T)): Provider<T> {
    return new Provider<T>(value);
}

export function findContext<T extends Object>(e: Element, t: Constructor<T>): T | undefined {
    const className = t.name;

    while (e && (!hasContext(e) || !(className in getContext(e)))) {
        e = e.parentElement as Element;
    }
    if (e) {
        const context = getContext(e);
        return context[className] as T;
    }
    return undefined;
}

class Consumer<T extends Object> extends ElementDirective {
    constructor(private cls: Constructor<T>, private cb: (t: T) => any) {
        super();
    }

    override process(e: Element) {
        // Find parent element with context
        const ctx = findContext(e, this.cls);
        if (ctx) {
            const result = this.cb(ctx);
            result.render(e);
        } else {
            throw new Error(`No provider of ${this.cls.name} in context`);
        }
    }
}

export function using<T extends Object>(c: Constructor<T>, cb: (t: T) => DenierTemplate | DenierComponent): Consumer<T> {
    return new Consumer(c, cb);
}
