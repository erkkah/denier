import { assert } from "./debug";
import { randomID } from "./id";

export type Constructor<T extends Object> = { new (...args: any): T };
export type Key = string | number;
export type RenderResult = ChildNode[];

export abstract class DenierDirective {
  private _ID = "";

  get ID() {
    if (this._ID === "") {
      this._ID = randomID();
    }
    return this._ID;
  }

  value(): any {
    return this.code();
  }

  code(): string {
    return `<!--${this.attr}-->`;
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
  private _host?: ChildNode;

  protected get element(): HTMLElement {
    assert(this._host);
    return this._host as HTMLElement;
  }

  override code() {
    return this.attr;
  }

  override render(host: ChildNode): RenderResult {
    this._host = host;
    this.process();
    return [host];
  }

  override update() {
    this.process();
  }

  abstract process(): void;
}

export abstract class ElementDirective extends DenierDirective {
  override render(host: ChildNode): RenderResult {
    return this.process(host as Element);
  }

  abstract process(e: Element): RenderResult;
}

class EventDirective<E extends Event> extends AttributeDirective {
  constructor(private event: string, private handler: (e: E) => void) {
    super();
  }

  override process(): void {
    this.element.addEventListener(this.event, this.handler as (e: Event) => void);
  }
}

export function on<E extends Event>(event: string, handler: (e: E) => void): EventDirective<E> {
  return new EventDirective(event, handler);
}

class RefDirective<T extends HTMLElement> extends AttributeDirective {
  constructor(private cb: (e: T) => void) {
    super();
  }

  override process(): void {
    this.cb(this.element as T);
  }
}

export function ref<T extends HTMLElement>(cb: (e: T) => void): RefDirective<T> {
  return new RefDirective(cb);
}

class FlagDirective extends AttributeDirective {
  constructor(private flag: string, private state: boolean | (() => boolean)) {
    super();
  }

  override process(): void {
    const set = typeof this.state === "function" ? this.state() : this.state;
    this.element.toggleAttribute(this.flag, set);
  }
}

export function flag(flag: string, state: boolean | (() => boolean)): FlagDirective {
  return new FlagDirective(flag, state);
}
