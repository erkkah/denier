import { DenierComponent } from "./component";
import { Constructor, ElementDirective } from "./directives";
import { findContext as findContextObject } from "./provider";
import { DenierTemplate } from "./template";

class Builder<T, S extends DenierState<T>> extends ElementDirective {
  constructor(
    private cls: Constructor<S>,
    private builder: (state: S) => DenierComponent | DenierTemplate,
    private filter?: (item: T) => boolean
  ) {
    super();
  }

  override process(e: Element): ChildNode {
    // Find parent element with context
    const state = findContextObject(e, this.cls);
    if (state) {
      const result = this.builder(state);
      const template =
        result instanceof DenierComponent ? result.template : result;
      state.listen(() => {
        if (!this.filter || this.filter(state.get())) {
          template.update();
        }
      });
      result.render(e);
    } else {
      throw new Error(`No provider of ${this.cls.name} in context`);
    }
    // ???
    return e;
  }
}

export abstract class DenierState<T> extends EventTarget {
  static readonly EVENT = "DenierState";

  private _state: T;

  constructor(initial: T) {
    super();
    this._state = { ...initial };
  }

  set(s: T) {
    this._state = { ...s };
    this.notify();
  }

  get(): Readonly<T> {
    return this._state;
  }

  update(s: Partial<T>) {
    this._state = { ...this._state, ...s };
    this.notify();
  }

  listen(cb: () => void) {
    this.addEventListener(DenierState.EVENT, cb);
  }

  private notify() {
    this.dispatchEvent(new CustomEvent(DenierState.EVENT));
  }
}

export function build<T, S extends DenierState<T>>(
  s: Constructor<S>,
  b: (s: S) => DenierComponent | DenierTemplate,
  filter?: (item: T) => boolean
) {
  return new Builder(s, b, filter);
}
