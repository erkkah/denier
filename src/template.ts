import { DenierComponent } from "./component";
import {
  DEBUG,
  assert,
  debugTraceBegin,
  debugTraceEnd,
  debugTraceException,
  debugTraceUpdateNode,
} from "./debug";
import { DenierDirective, Key } from "./directives";

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
}

class List extends DenierDirective {
  private marker = document.createComment(this.ID) as ChildNode;
  private keyed = new Map<Key, [DenierDirective, ChildNode]>();

  constructor(private items: Iterable<any>) {
    super();
  }

  setItems(items: Iterable<any>) {
    this.items = items;
  }

  override render(host: ChildNode): ChildNode {
    host.replaceWith(this.marker);

    const o = new MutationObserver((mutations: MutationRecord[]) => {
      for (const m of mutations) {
        if (m.type === "childList") {
          for (const c of m.removedNodes) {
            if (c == this.marker) {
              o.disconnect();
              for (const [, node] of this.keyed.values()) {
                node.remove();
              }
            }
          }
        }
      }
    });

    o.observe(this.marker.parentNode!, {
      childList: true,
    });

    const nodes: ChildNode[] = [];

    // ??? Collect directive types
    // ??? complain if not templates or not keyed ?
    for (const item of this.items) {
      const d = makeDirective(item);
      const node = document.createComment("");
      const rendered = d.render(node);
      this.keyed.set(d.key, [d, rendered]);
      nodes.push(rendered);
    }

    this.marker.after(...nodes);

    return this.marker;
  }

  override update(): void {
    let cursor: ChildNode | null = this.marker;
    const removed = new Set(this.keyed.keys());

    for (const item of this.items) {
      const d = makeDirective(item);

      const existing = this.keyed.get(d.key);
      if (existing) {
        const [directive, node] = existing;
        cursor!.after(node);
        cursor = node;
        directive.update();
        removed.delete(d.key);
      } else {
        const node = document.createComment("");
        const rendered = d.render(node);
        this.keyed.set(d.key, [d, rendered]);
        cursor!.after(rendered);
        cursor = rendered;
      }
    }

    for (const key of removed) {
      const old = this.keyed.get(key);
      assert(old);
      const [_, node] = old;
      node.remove();
      this.keyed.delete(key);
    }
  }
}

class Dynamic extends DenierDirective {
  private rendered?: ChildNode;
  private directive?: DenierDirective;
  private lastValue: any;

  constructor(private f: () => any) {
    super();
  }

  override value() {
    return this.f();
  }

  override render(e: ChildNode): ChildNode {
    const v = this.value();
    this.lastValue = v;
    const d = makeDirective(v);
    this.directive = d;
    this.rendered = d.render(e);
    return this.rendered;
  }

  override update(): void {
    const v = this.value();

    if (v === this.lastValue) {
      this.directive?.update();
      return;
    }

    if (
      typeof v === "object" &&
      Symbol.iterator in v &&
      this.directive instanceof List
    ) {
      this.directive.setItems(v);
      this.directive.update();
      return;
    }

    this.render(this.rendered!);
  }
}

class AttributeSetter extends DenierDirective {
  private host?: ChildNode;

  constructor(private name: string, private valueDirective: DenierDirective) {
    super();
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

  override get key(): Key {
    return this._t.listKey ?? this.ID;
  }
}

function makeDirective(value: any): DenierDirective {
  if (value instanceof DenierDirective) {
    return value;
  }

  if (typeof value === "function") {
    return new Dynamic(value);
  }

  if (value instanceof DenierTemplate) {
    return new Template(value);
  }

  if (typeof value === "object" && Symbol.iterator in value) {
    return new List(value);
  }

  return new Constant(value);
}

export class DenierTemplate {
  private code = "";
  private keyValue?: string | number;
  private directives = new Map<string, DenierDirective>();
  private rendered: ChildNode | null = null;

  private cleanupTimer?: number;
  private cleanupTarget?: any;
  private cleanupHandler?: (o: any) => void;

  constructor(strings: TemplateStringsArray, substitutions: any[]) {
    const directives: DenierDirective[] = substitutions.map((sub) =>
      makeDirective(sub)
    );

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

      //debugTraceBegin("template", this.rendered);

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
        debugTraceBegin("node", child);

        if (!(child instanceof Element)) {
          continue;
        }

        for (const attr of child.attributes) {
          const elementMatch =
            attr.name.match(/^denier-(\S+)$/) ||
            attr.value.match(/^denier-(\S+)$/);
          if (elementMatch) {
            const id = elementMatch[1];
            const d = getDirective(id);
            debugTraceBegin("directive", d.constructor.name);
            const node = d.render(child);
            if (this.rendered === child) {
              this.rendered = node;
            }
            debugTraceUpdateNode(child, node as Element);
            debugTraceEnd("directive");
            directivesDone.add(id);
            if (!DEBUG) {
              child.removeAttribute(attr.name);
            }
            continue;
          }

          const valueMatch = attr.value.match(/<div id=denier-(\S+)\s*>/m);
          if (valueMatch) {
            const id = valueMatch[1];
            const setter = new AttributeSetter(attr.name, getDirective(id));
            this.directives.set(id, setter);
            debugTraceBegin("directive", "AttributeSetter");
            setter.render(child);
            debugTraceEnd("directive");
            directivesDone.add(id);
          }
        }

        debugTraceEnd("node");
      }

      if (directivesDone.size != this.directives.size) {
        const nonrendered = [...this.directives.entries()]
          .filter(([id, _directive]) => !directivesDone.has(id))
          .map((d) => `${d[1].constructor.name}(${d[0]})`);
        throw new Error(
          `Template error, directives left unrendered: ${nonrendered.join(
            ", "
          )}`
        );
      }

      //debugTraceEnd("template");
      return this;
    } catch (err) {
      debugTraceException(err);
      throw err;
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
      throw new Error("Cannot update unrendered template");
    }
    for (const directive of this.directives.values()) {
      directive.update();
    }
  }

  key(key: Key): this {
    this.keyValue = key;
    return this;
  }

  get listKey(): Key | undefined {
    return this.keyValue;
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
