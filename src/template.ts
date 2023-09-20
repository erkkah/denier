
export abstract class DenierDirective {
    abstract value(): any;
    render(parent: Node) {}
}

class Constant extends DenierDirective {
    constructor(private c: any) {
        super();
    }

    override value(): any {
        return this.c;
    }
}

class Dynamic extends DenierDirective {
    private wrappedDirective?: DenierDirective;

    constructor(private f: () => any) {
        super();
    }

    override value(): any {
        let v = this.f();

        if (v instanceof DenierTemplate) {
            v = new Template(v);
        }

        if (v instanceof DenierDirective) {
            this.wrappedDirective = v;
            return v.value();
        }

        this.wrappedDirective = undefined;
        return v;
    }

    override render(e: Element) {
        this.wrappedDirective?.render(e);
    }
}

export function randomID(): string {
    const buffer = new Uint8Array(13);
    window.crypto.getRandomValues(buffer);
    return btoa(String(buffer)).slice(0, 16);
}

export abstract class DenierComponent extends DenierDirective {
    private ID = randomID();
    private _template?: DenierTemplate;

    get template(): DenierTemplate {
        // ??? Catch errors
        if (!this._template) {
            this._template = this.build();
        }
        return this._template;
    }

    override value(): string {
        return `<div id="${this.ID}"></div>`;
    }

    override render(parent: Element) {
        const host = (parent as HTMLDivElement).querySelector("#" + this.ID);
        if (!host) {
            throw new Error(`Invalid nested template`);
        }

        const t = this.template;
        if (t.isRendered) {
            t.mount(host);
        } else {
            t.render(host);
        }
    }

    /**
     * Gets called _once_ to build the component template.
     */
    abstract build(): DenierTemplate;
}

class Template extends DenierComponent {
    constructor(private _t: DenierTemplate) {
        super();
    }

    override build(): DenierTemplate {
        return this._t;
    }
}


export class DenierTemplate {
    private directives: DenierDirective[] = [];
    private rendered: Node | null = null;

    private cleanupTimer?: number;
    private cleanupTarget?: any;
    private cleanupHandler?: (o: any) => void;

    constructor(private strings: TemplateStringsArray, substitutions: any[]) {
        for (const i in substitutions) {
            const sub = substitutions[i];

            if (!(sub instanceof DenierDirective)) {
                if (typeof sub === "function") {
                    this.directives.push(new Dynamic(sub));
                } else if (sub instanceof DenierTemplate) {
                    const template = new Template(sub)
                    this.directives.push(template);
                } else {
                    this.directives.push(new Constant(sub));
                }
            } else {
                this.directives.push(sub);
            }
        }
    }

    /**
     * Renders this template into the specified `host` element.
     * 
     * Note that the `host` element will be taken over (replaced) by
     * the result of rendering the template.
     * 
     * The `host` element must have a parent (be directly connected)
     * at the time of render.
     * 
     * @param host a directly connected Element
     * @returns this template, to allow for chaining
     */
    render(host: Node): this {
        let e: Element = document.createElement("div");

        if (this.strings.length === 0) {
            return this;
        }

        let v = this.strings[0];

        for (let i = 1; i < this.strings.length; i++) {
            v += String(this.directives[i - 1].value());
            v += this.strings[i];
        }

        v = v.trim();
        e.insertAdjacentHTML("afterbegin", v);

        let rendered: Node = e;
        if (rendered.childNodes.length == 1) {
            rendered = rendered.firstChild!;
        }
        
        this.rendered = rendered;
        this.mount(host);

        const parent = rendered.parentNode!;

        for (const child of this.directives) {
            child.render(parent);
        }

        return this;
    }

    get isRendered(): boolean {
        return !!this.rendered;
    }

    /**
     * Registers a cleanup handler to be called when the rendered element
     * gets disconnected.
     * 
     * The callback will be called asynchronously, a "short time" after
     * the rendered elements `isConnected` property returns false.
     * 
     * @param target optional argument that will be passed to the cleanup handler
     * @returns this template, to allow for chaining
     */
    cleanup<T>(handler: (o: T) => void, target?: T): this {
        if (this.cleanupHandler) {
            throw new Error("Can only register one cleanup handler");
        }
        this.cleanupHandler = handler;
        this.cleanupTarget = target;
        this.cleanupTimer = setInterval(() => {
            if (this.rendered && !this.rendered.isConnected) {
                clearInterval(this.cleanupTimer);
                this.cleanupHandler?.(this.cleanupTarget);
                this.rendered = null;
            }
        }, 500);

        return this;
    }

    /**
     * Mounts the rendered result into a host element.
     *
     * Note that the `host` element will be taken over (replaced) by
     * the rendered result element.
     *
     * If the rendered element is already mounted it will be moved
     * from its old position in the DOM.
     * 
     * It is an error to mount an unrendered template.
     */
    mount(host: Node) {
        if (!this.rendered) {
            throw new Error("Cannot mount unrendered template");
        }
        host.parentElement?.replaceChild(this.rendered, host);
    }

    /**
     * Updates (re-renders) the template in place.
     *
     * Embedded directives gets shallowly re-evaluated.
     * Specifically, embedded templates will be re-mounted as-is into
     * the rendered result.
     */
    update() {
        if (!this.rendered) {
            // ??? Change to debug print instead?
            // Should spurious late updates be ok?
            throw new Error("Cannot update unrendered template");
        }
        this.render(this.rendered);
    }
}

/**
 * A raw string tag used to create DenierTemplate instances for rendering.
 */
export function html(strings: TemplateStringsArray, ...substitutions: any[]): DenierTemplate {
    return new DenierTemplate(strings, substitutions);
}
