import { DEBUG } from "./debug";
import { randomID } from "./id";

export type Constructor<T extends Object> = { new (...args: any): T };

export abstract class DenierDirective {
  private _dirty = true;

  get dirty(): boolean {
    return this._dirty;
  }

  protected markDirty() {
    this._dirty = true;
  }

  protected markClean() {
    this._dirty = false;
  }

  abstract value(): any;

  render(parent: Node) {
    this._dirty = false;
  }
}

abstract class IDDirective extends DenierDirective {
  private ID = randomID();

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

export abstract class AttributeDirective extends IDDirective {
  override value() {
    return this.attr;
  }

  override render(parent: Element) {
    const e = parent.querySelector(`*[${this.attr}]`);
    if (!e) {
      throw new Error(
        `Directive ${this.constructor.name} must be in attribute position`
      );
    }

    e.removeAttribute(this.attrName);
    this.process(e);
  }

  override debugInfo(): string {
    return `a:${this.constructor.name}`;
  }

  abstract process(e: Element): void;
}

export abstract class ElementDirective extends IDDirective {
  override value(): string {
    return `<div ${this.attr}></div>`;
  }

  override render(parent: Element) {
    const e = parent.querySelector(`*[${this.attr}]`);
    if (!e) {
      throw new Error(
        `Directive ${this.constructor.name} must be in element position`
      );
    }

    e.removeAttribute(this.attrName);
    this.process(e);
  }

  override debugInfo(): string {
    return `e:${this.constructor.name}`;
  }

  abstract process(e: Element): void;
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
