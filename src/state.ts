import { Constructor, ElementDirective } from "./directives";
import { findContext as findContextObject } from "./provider";
import { DenierComponent, DenierDirective, DenierTemplate } from "./template";

class Updater<T, S extends DenierState<T>> extends ElementDirective {
    constructor(private cls: Constructor<S>, private renderable: DenierComponent | DenierTemplate, private filter?: (item: T) => boolean) {
        super();
    }

    override process(e: Element) {
        // Find parent element with context
        const state = findContextObject(e, this.cls);
        if (state) {
            let template = this.renderable instanceof DenierComponent ? this.renderable.template : this.renderable;
            state.listen(() => template.update());
            this.renderable.render(e);
        } else {
            throw new Error(`No provider of ${this.cls.name} in context`);
        }
    }
}

export abstract class DenierState<T> extends EventTarget {
    static readonly EVENT = "DenierState";

    private _state: T;

    get state(): T {
        return this._state;
    }

    constructor(initial: T) {
        super();
        this._state = { ...initial };
    }

    set(s: T) {
        this._state = { ...s };
        this.notify();
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

export function update<T, S extends DenierState<T>>(s: Constructor<S>, t: DenierComponent | DenierTemplate, filter?: (item: T) => boolean) {
    return new Updater(s, t, filter);
}
