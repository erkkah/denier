import { DenierComponent } from "./component";
import {
  AttributeDirective,
  Constructor,
  ElementDirective,
  RenderResult,
} from "./directives";
import { DenierTemplate } from "./template";

type DenierContext<T> = Map<Function, T>;
type DenierContextHolder<T> = Element & { _denierContext?: DenierContext<T> };

function getContext<T>(e: Element): DenierContext<T> {
  const holder = e as DenierContextHolder<T>;
  if (!holder._denierContext) {
    holder._denierContext = new Map();
  }
  return holder._denierContext;
}

function hasContext(e: Element): boolean {
  return "_denierContext" in e;
}

class Provider extends AttributeDirective {
  private _values: Object[];

  constructor(values: Array<Object | (() => Object)>) {
    super();
    this._values = values.map((value) =>
      typeof value === "function" ? value() : value
    );
  }

  override process(): void {
    const context = getContext(this.element);
    for (const value of this._values) {
      const type = value.constructor;
      context.set(type, value);
    }
  }
}

export function provide(...values: Array<Object | (() => Object)>): Provider {
  return new Provider(values);
}

export function findContext<T extends Object>(
  e: Element,
  t: Constructor<T>
): T | undefined {
  while (e && (!hasContext(e) || !(getContext(e).has(t)))) {
    e = e.parentElement as Element;
  }
  if (e) {
    const context = getContext<T>(e);
    return context.get(t);
  }
  return undefined;
}

class Consumer<T extends Object> extends ElementDirective {
  constructor(private cls: Constructor<T>, private cb: (t: T) => any) {
    super();
  }

  override process(e: Element): RenderResult {
    // Find parent element with context
    const ctx = findContext(e, this.cls);
    if (ctx) {
      const result = this.cb(ctx);
      result.render(e);
    } else {
      throw new Error(`No provider of ${this.cls.name} in context`);
    }
    // ???
    return [e];
  }
}

export function using<T extends Object>(
  c: Constructor<T>,
  cb: (t: T) => DenierTemplate | DenierComponent
): Consumer<T> {
  return new Consumer(c, cb);
}
