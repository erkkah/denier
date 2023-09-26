import { DenierComponent } from "./component";
import {
  AttributeDirective,
  Constructor,
  ElementDirective,
} from "./directives";
import { DenierTemplate } from "./template";

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

  override debugInfo(): string {
    const valueTypes = this._values.map((v) => v.constructor.name);
    return super.debugInfo() + `(${valueTypes.join(",")})`;
  }

  override process(e: Element): void {
    const context = getContext(e);
    for (const value of this._values) {
      const type = value.constructor.name;
      context[type] = value;
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

  override process(e: Element): ChildNode {
    // Find parent element with context
    const ctx = findContext(e, this.cls);
    if (ctx) {
      const result = this.cb(ctx);
      result.render(e);
    } else {
      throw new Error(`No provider of ${this.cls.name} in context`);
    }
    // ???
    return e;
  }

  override debugInfo(): string {
    return super.debugInfo() + `(${this.cls.name})`;
  }
}

export function using<T extends Object>(
  c: Constructor<T>,
  cb: (t: T) => DenierTemplate | DenierComponent
): Consumer<T> {
  return new Consumer(c, cb);
}
