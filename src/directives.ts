import { DenierDirective, randomID } from "./template";

class EventDirective extends DenierDirective {
    private ID: string;
    
    constructor(private event: string, private handler: () => void) {
        super();
        this.ID = randomID();
    }

    override value() {
        return `denier="${this.ID}"`;
    }

    override render(parent: Element) {
        const e = parent.querySelector(`*[denier="${this.ID}"]`);
        if (e == null) {
            throw new Error(`Invalid event directive for "${this.event}", must be in attribute position`)
        }
        e.addEventListener(this.event, this.handler);
    }
}

export function on(event: string, handler: () => void): EventDirective {
    return new EventDirective(event, handler);
}

class RefDirective<T extends Element> extends DenierDirective {
    private ID: string;

    constructor(private cb: (e: T) => void) {
        super();
        this.ID = randomID();
    }

    override value() {
        return `denier="${this.ID}"`;
    }

    override render(parent: Element) {
        const e = parent.querySelector(`*[denier="${this.ID}"]`);
        if (e == null) {
            throw new Error(`Invalid ref directive, must be in attribute position`)
        }
        this.cb(e as T);
    }
}

export function ref<T extends Element>(cb: (e: T) => void): RefDirective<T> {
    return new RefDirective(cb);
}
