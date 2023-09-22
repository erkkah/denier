import { DenierDirective, randomID } from "./template";

export type Constructor<T extends Object> = { new (...args: any): T };

export abstract class AttributeDirective extends DenierDirective {
  private ID = randomID();

  override value() {
    return `denier="${this.ID}"`;
  }

  override render(parent: Element) {
    const e = parent.querySelector(`*[denier="${this.ID}"]`);
    if (!e) {
      throw new Error(
        `Directive ${this.constructor.name} must be in attribute position`
      );
    }

    this.process(e);
  }

  abstract process(e: Element): void;
}

export abstract class ElementDirective extends DenierDirective {
  private ID = randomID();

  override value(): string {
    return `<div id="${this.ID}"></div>`;
  }

  override render(parent: Element) {
    const e = parent.querySelector("#" + this.ID);
    if (!e) {
      throw new Error(
        `Directive ${this.constructor.name} must be in element position`
      );
    }

    this.process(e);
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
