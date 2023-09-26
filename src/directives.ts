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

  abstract code(): string;

  value(): any {
    return this.code();
  }

  render(host: ChildNode): ChildNode {
    this._dirty = false;
    return host;
  }

  update() {
    this._dirty = false;
  }
}

export abstract class DynamicDirective extends DenierDirective {
  readonly ID = randomID();

  override code() {
    return `<denier id=${this.ID} />`;
  }

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

export abstract class AttributeDirective extends DynamicDirective {
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

export abstract class ElementDirective extends DynamicDirective {
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
