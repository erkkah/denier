import { randomID } from "./id";

export type Constructor<T extends Object> = { new (...args: any): T };
export type Key = string | number;
export type RenderResult = ChildNode[];

export abstract class DenierDirective {
  readonly ID = randomID();

  value(): any {
    return this.code();
  }

  code(): string {
    return `<div id=${this.attr} ></div>`;
  }

  abstract render(host: ChildNode): RenderResult;

  update(): void {}

  get attr(): string {
    return `denier-${this.ID}`;
  }

  get key(): Key {
    return this.ID;
  }
}

export abstract class AttributeDirective extends DenierDirective {
  override code() {
    return this.attr;
  }

  override render(host: ChildNode): RenderResult {
    this.process(host as Element);
    return [host];
  }

  abstract process(e: Element): void;
}

export abstract class ElementDirective extends DenierDirective {
  override render(host: ChildNode): RenderResult {
    return this.process(host as Element);
  }

  abstract process(e: Element): RenderResult;
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
