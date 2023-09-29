import { DenierComponent } from "./component";
import {
  debugTraceException,
  popDebugTrace,
  debugTrace as pushDebugTrace,
} from "./debug";
import { DenierDirective } from "./directives";

class Constant extends DenierDirective {
  constructor(private c: any) {
    super();
  }

  override value() {
    return this.c;
  }

  override render(e: ChildNode): ChildNode {
    const text = document.createTextNode(this.c);
    e.replaceWith(text);
    return text;
  }

  override debugInfo(): string {
    return `${this.constructor.name}`;
  }
}

class Dynamic extends DenierDirective {
  private renderedValue: any;
  private rendered?: ChildNode;

  constructor(private f: () => any) {
    super();
  }

  override value() {
    return this.f();
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

    return this.rendered;
  }

  override update(): void {
    this.render(this.rendered!);
  }

  override debugInfo(): string {
    return `e:${this.constructor.name}`;
  }
}

class AttributeSetter extends DenierDirective {
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
  private code = "";
  private directives = new Map<string, DenierDirective>();
  private rendered: ChildNode | null = null;

  private cleanupTimer?: number;
  private cleanupTarget?: any;
  private cleanupHandler?: (o: any) => void;

  constructor(strings: TemplateStringsArray, substitutions: any[]) {
    const directives: DenierDirective[] = substitutions.map((sub) => {
      if (sub instanceof DenierDirective) {
        return sub;
      }

      if (typeof sub === "function") {
        return new Dynamic(sub);
      }

      if (sub instanceof DenierTemplate) {
        return new Template(sub);
      }

      return new Constant(sub);
    });

    if (strings.length > 0) {
      let v = strings[0];

      for (let i = 1; i < strings.length; i++) {
        const directive = directives[i - 1];
        this.directives.set(directive.ID, directive);
        v += directive.code();
        v += strings[i];
      }

      this.code = v.trim();
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
    try {
      let e: Element = document.createElement("div");
      e.insertAdjacentHTML("afterbegin", this.code);

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

      pushDebugTrace(this.code, rendered);

      const newElements: ChildNode[] = [];
      const renderedElement = rendered as Element;
      newElements.push(renderedElement);
      if (renderedElement.hasChildNodes()) {
        newElements.push(...renderedElement.querySelectorAll("*"));
      }

      const directivesDone = new Set<string>();
      const getDirective = (id: string) => {
        const d = this.directives.get(id);
        if (!d) {
          throw new Error("Invalid directive reference");
        }
        return d;
      };

      for (let child of newElements) {
        if (!(child instanceof Element)) {
          continue;
        }

        for (const attr of child.attributes) {
          const elementMatch = attr.name.match(/^denier-(\S+)$/) || attr.value.match(/^denier-(\S+)$/);
          if (elementMatch) {
            const id = elementMatch[1];
            getDirective(id).render(child) as Element;
            directivesDone.add(id);
            child.removeAttribute(attr.name);
            continue;
          }

          const valueMatch = attr.value.match(/<div id=denier-(\S+)\s*>/m);
          if (valueMatch) {
            const id = valueMatch[1];
            const setter = new AttributeSetter(attr.name, getDirective(id));
            this.directives.set(id, setter);
            setter.render(child);
            directivesDone.add(id);
          }
        }
      }
      if (directivesDone.size != this.directives.size) {
        // ??? Improve message
        throw new Error("Template error");
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
    for (const directive of this.directives.values()) {
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
