import { DEBUG } from "./debug";
import { randomID } from "./id";

export type Constructor<T extends Object> = { new (...args: any): T };

export abstract class DenierDirective {
  readonly ID = randomID();

  value(): any {
    return this.code();
  }

  code(): string {
    return `<div id=${this.attrName} ></div>`;
  }

  abstract render(host: ChildNode): ChildNode;

  update(): void {}

  get attrName(): string {
    return `denier-${this.ID}`;
  }

  get attr(): string {
    if (DEBUG) {
      return `denier-${this.ID}="${this.debugInfo()}"`;
    } else {
      return this.attrName;
    }
  }

  abstract debugInfo(): string;
}

export abstract class AttributeDirective extends DenierDirective {
  override code() {
    return this.attr;
  }

  override render(host: ChildNode): ChildNode {
    this.process(host as Element);
    return host;
  }

  override debugInfo(): string {
    return `a:${this.constructor.name}`;
  }

  abstract process(e: Element): void;
}

export abstract class ElementDirective extends DenierDirective {
  override render(host: ChildNode): ChildNode {
    return this.process(host as Element);
  }

  override debugInfo(): string {
    return `e:${this.constructor.name}`;
  }

  abstract process(e: Element): ChildNode;
}

class EventDirective extends AttributeDirective {
  constructor(private event: string, private handler: () => void) {
    super();
  }

  override process(e: Element): void {
    e.addEventListener(this.event, this.handler);
  }
}

export function on(event: string, handler: () => void): EventDirective {
  return new EventDirective(event, handler);
}

class RefDirective<T extends Element> extends AttributeDirective {
  constructor(private cb: (e: T) => void) {
    super();
  }

  override process(e: Element) {
    this.cb(e as T);
  }
}

export function ref<T extends Element>(cb: (e: T) => void): RefDirective<T> {
  return new RefDirective(cb);
}

// <div ${props({a: b, c: d})}>
// <div ${props<HTMLDivElement>({a: b, c: d})}>
