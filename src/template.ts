import { DenierComponent } from "./component";
import {
  debugTraceException,
  popDebugTrace,
  debugTrace as pushDebugTrace,
} from "./debug";
import { DenierDirective, DynamicDirective } from "./directives";

class Constant extends DenierDirective {
  constructor(private c: any) {
    super();
    this.markClean();
  }

  override code(): any {
    return this.c;
  }
}

class Dynamic extends DynamicDirective {
  private renderedValue: any;
  private rendered?: ChildNode;

  constructor(private f: () => any) {
    super();
  }

  override value() {
    const v = this.f();
    if (v !== this.renderedValue) {
      this.markDirty();
    }
    return v;
  }

  override render(e: ChildNode): ChildNode {
    let v = this.value();

    this.renderedValue = v;

    if (v instanceof DenierTemplate) {
      v = new Template(v);
    }

    if (v instanceof DenierDirective) {
      this.rendered = v.render(e);
    } else {
      const text = document.createTextNode(v);
      e.replaceWith(text);
      this.rendered = text;
    }

    this.markClean();
    return this.rendered;
  }

  override update(): void {
    this.render(this.rendered!);
  }

  override debugInfo(): string {
    return "";
  }
}

class AttributeSetter extends DynamicDirective {
  private host?: ChildNode;

  constructor(private name: string, private valueDirective: DenierDirective) {
    super();
  }

  override debugInfo(): string {
    return "";
  }

  override render(host: ChildNode): ChildNode {
    this.host = host;
    (host as Element).setAttribute(this.name, this.valueDirective.value());
    return host;
  }

  override update(): void {
      this.render(this.host!);
  }
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
  private directiveMap = new Map<string, DenierDirective>();
  private rendered: ChildNode | null = null;

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
          const template = new Template(sub);
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
  render(host: ChildNode): this {
    if (this.strings.length === 0) {
      return this;
    }

    let v = this.strings[0];

    let dirty = false;

    for (let i = 1; i < this.strings.length; i++) {
      const directive = this.directives[i - 1];
      if (directive instanceof DynamicDirective) {
        this.directiveMap.set(directive.ID, directive);
      }
      v += String(directive.code());
      dirty ||= directive.dirty;
      v += this.strings[i];
    }

    // if (this.rendered && !dirty) {
    //   return this;
    // }

    v = v.trim();

    try {
      let e: Element = document.createElement("div");
      e.insertAdjacentHTML("afterbegin", v);

      let rendered: ChildNode = e;
      if (rendered.childNodes.length == 0) {
        rendered = document.createTextNode("");
      } else if (rendered.childNodes.length == 1) {
        rendered = rendered.firstChild!;
      }

      this.rendered = rendered;
      this.mount(host);

      if (rendered.nodeType !== Node.ELEMENT_NODE) {
        return this;
      }

      pushDebugTrace(v, rendered);

      const newElements: Element[] = [];
      const renderedElement = rendered as Element;
      newElements.push(renderedElement);
      if (renderedElement.hasChildNodes()) {
        newElements.push(...renderedElement.querySelectorAll("*"));
      }

      for (const child of newElements) {
        if (child.tagName === "DENIER") {
          const d = this.directiveMap.get(child.id);
          if (!d) {
            throw new Error("Invalid directive reference");
          }
          d.render(child);
        }

        for (const attr of child.attributes) {
          const nameMatch = attr.name.match(/^denier-(\S+)$/);
          if (nameMatch) {
            const id = nameMatch[1];
            const d = this.directiveMap.get(id);
            if (!d) {
              throw new Error("Invalid directive reference");
            }
            d.render(child);
          }

          const valueMatch = attr.value.match(/<denier\s+id=(\S+)\s*\/>/m);
          if (valueMatch) {
            const id = valueMatch[1];
            const d = this.directiveMap.get(id);
            if (!d) {
              throw new Error("Invalid directive reference");
            }
            const setter = new AttributeSetter(attr.name, d);
            this.directiveMap.set(id, setter);
            setter.render(child);
          }
        }
      }
      return this;
    } catch (err) {
      debugTraceException(err);
      throw err;
    } finally {
      popDebugTrace();
    }
  }

  get isRendered(): boolean {
    return !!this.rendered;
  }

  get renderedNode(): ChildNode {
    if (!this.rendered) {
      throw new Error("Node is not rendered");
    }
    return this.rendered;
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
  mount(host: ChildNode) {
    if (!this.rendered) {
      throw new Error("Cannot mount unrendered template");
    }
    host.replaceWith(this.rendered);
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
    for (const directive of this.directiveMap.values()) {
      directive.update();
    }
  }
}

/**
 * A raw string tag used to create DenierTemplate instances for rendering.
 */
export function html(
  strings: TemplateStringsArray,
  ...substitutions: any[]
): DenierTemplate {
  return new DenierTemplate(strings, substitutions);
}
