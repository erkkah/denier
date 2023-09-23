import { randomID } from "./id";

export type Constructor<T extends Object> = { new (...args: any): T };

export abstract class DenierDirective {
  abstract value(): any;
  render(parent: Node) {}
}

export abstract class AttributeDirective extends DenierDirective {
  private ID: string

  constructor(prefix: string) {
    super();
    this.ID = randomID(prefix);
  }

  override value() {
    return `denier-attr="${this.ID}"`;
  }

  override render(parent: Element) {
    const e = parent.querySelector(`*[denier-attr="${this.ID}"]`);
    if (!e) {
      throw new Error(
        `Directive ${this.constructor.name} must be in attribute position`
      );
    }

    e.removeAttribute("denier-attr");
    this.process(e);
  }

  abstract process(e: Element): void;
}

export abstract class ElementDirective extends DenierDirective {
  private ID: string;

  constructor(prefix: string) {
    super();
    this.ID = randomID(prefix);
  }

  override value(): string {
    return `<div denier-elem="${this.ID}"></div>`;
  }

  override render(parent: Element) {
    // const e = parent.querySelector("#" + this.ID);
    const e = parent.querySelector(`*[denier-elem="${this.ID}"]`);
    if (!e) {
      throw new Error(
        `Directive ${this.constructor.name} must be in element position`
      );
    }

    e.removeAttribute("denier-elem");
    this.process(e);
  }

  abstract process(e: Element): void;
}

class EventDirective extends AttributeDirective {
  constructor(private event: string, private handler: () => void) {
    super("event");
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
    super("ref");
  }

  override process(e: Element) {
    this.cb(e as T);
  }
}

export function ref<T extends Element>(cb: (e: T) => void): RefDirective<T> {
  return new RefDirective(cb);
}
