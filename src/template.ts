import { DenierComponent } from "./component";
import {
  DEBUG,
  assert,
  debugTraceBegin,
  debugTraceEnd,
  debugTraceException,
} from "./debug";
import { DenierDirective, Key, RenderResult } from "./directives";

class Constant extends DenierDirective {
  constructor(private c: any) {
    super();
  }

  override value() {
    return this.c;
  }

  override render(e: ChildNode): RenderResult {
    const text = document.createTextNode(this.c);
    e.replaceWith(text);
    return [text];
  }
}

class List extends DenierDirective {
  private marker = document.createComment(this.ID) as ChildNode;
  private keyed = new Map<Key, [DenierDirective, RenderResult]>();

  constructor(private items: Iterable<any>) {
    super();
  }

  setItems(items: Iterable<any>) {
    this.items = items;
  }

  override render(host: ChildNode): RenderResult {
    host.replaceWith(this.marker);

    const o = new MutationObserver((mutations: MutationRecord[]) => {
      for (const m of mutations) {
        if (m.type === "childList") {
          for (const c of m.removedNodes) {
            if (c == this.marker) {
              o.disconnect();
              for (const [, result] of this.keyed.values()) {
                result.forEach((r) => r.remove());
              }
            }
          }
        }
      }
    });

    o.observe(this.marker.parentNode!, {
      childList: true,
    });

    const nodes: Node[] = [];

    // ??? Collect directive types
    // ??? complain if not templates or not keyed ?
    for (const item of this.items) {
      const d = makeDirective(item);
      const node = document.createComment("");
      const rendered = d.render(node);
      this.keyed.set(d.key, [d, rendered]);
      // ??? Can we really have more than one?
      nodes.push(...rendered);
    }

    this.marker.after(...nodes);

    return [this.marker];
  }

  private cursorFromResult(result: RenderResult): ChildNode {
    assert(result.length > 0);
    return result[result.length - 1];
  }

  private removeNodes(result: ChildNode[]): void {
    if (result.length > 0) {
      const marker = document.createElement("comment");
      const parent = result[0].parentNode!;
      const grandparent = parent.parentNode!;
      grandparent.replaceChild(marker, parent);
      result.forEach((r) => r.remove());
      grandparent.replaceChild(parent, marker);
    }
  }

  private sameAfterCursor(cursor: ChildNode, nodes: RenderResult): boolean {
    let a = cursor.nextSibling;

    return nodes.every((b) => {
      const equal = a === b;
      if (a) {
        a = a.nextSibling;
      }
      return equal;
    });
  }

  override update(): void {
    let cursor: ChildNode | null = this.marker;
    const removed = new Set(this.keyed.keys());

    for (const item of this.items) {
      const d = makeDirective(item);

      const existing = this.keyed.get(d.key);
      if (existing) {
        const [directive, result] = existing;
        if (!this.sameAfterCursor(cursor, result)) {
          cursor!.after(...result);
        }
        cursor = this.cursorFromResult(result);
        directive.update();
        removed.delete(d.key);
      } else {
        const node = document.createComment("");
        const rendered = d.render(node);
        this.keyed.set(d.key, [d, rendered]);
        cursor!.after(...rendered);
        cursor = this.cursorFromResult(rendered);
      }
    }

    const oldNodes: ChildNode[] = [];

    for (const key of removed) {
      const old = this.keyed.get(key);
      assert(old);
      const [_, result] = old;
      oldNodes.push(...result);
      this.keyed.delete(key);
    }

    this.removeNodes(oldNodes);
  }
}

class Dynamic extends DenierDirective {
  private rendered?: RenderResult;
  private directive?: DenierDirective;
  private lastValue: any;

  constructor(private f: () => any) {
    super();
  }

  override value() {
    return this.f();
  }

  private renderValue(e: ChildNode, v: any): RenderResult {
    const d = makeDirective(v);
    this.directive = d;
    this.rendered = d.render(e);
    return this.rendered;
  }

  override render(e: ChildNode): RenderResult {
    const v = this.value();
    this.lastValue = v;
    return this.renderValue(e, v);
  }

  override update(): void {
    const v = this.value();

    if (v === this.lastValue) {
      this.directive?.update();
      return;
    }

    this.lastValue = v;

    if (
      typeof v === "object" &&
      Symbol.iterator in v &&
      this.directive instanceof List
    ) {
      this.directive.setItems(v);
      this.directive.update();
      return;
    }

    assert(this.rendered);
    const [first, ...rest] = this.rendered;
    rest.forEach((r) => r.remove());
    this.renderValue(first, v);
  }
}

class AttributeSetter extends DenierDirective {
  private host?: ChildNode;

  constructor(private name: string, private valueDirective: DenierDirective) {
    super();
  }

  override render(host: ChildNode): RenderResult {
    let value: any;
    try {
      value = this.valueDirective.value();
    } catch (err) {
      if (DEBUG) {
        (host as Element).setAttribute(this.name, "❌");
      }
      throw new Error(`Error setting attribute "${this.name}": ${err}`);
    }
    this.host = host;
    (host as Element).setAttribute(this.name, value);
    return [host];
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
  private rendered: RenderResult | null = null;

  private cleanupTimer?: number;
  private cleanupTarget?: any;
  private cleanupHandler?: (o: any) => void;

  constructor(
    private strings: TemplateStringsArray,
    private substitutions: any[]
  ) {}

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
      const directives: DenierDirective[] = this.substitutions.map((sub) =>
        makeDirective(sub)
      );

      if (this.strings.length > 0) {
        let v = this.strings[0];

        for (let i = 1; i < this.strings.length; i++) {
          const directive = directives[i - 1];
          this.directives.set(directive.ID, directive);
          v += directive.code();
          v += this.strings[i];
        }

        this.code = v.trim();
      }

      const t: HTMLTemplateElement = document.createElement("template");
      t.innerHTML = this.code;
      const fragment = t.content;

      const w = document.createTreeWalker(
        fragment,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT
      );

      const newNodes: Node[] = [];

      // Skip the top fragment node
      if (w.nextNode()) {
        for (
          let node: Node | null = w.currentNode;
          node != null;
          node = w.nextNode()
        ) {
          newNodes.push(node);
        }
      }

      this.rendered = [...fragment.childNodes];
      this.mount(host);

      const directivesDone = new Set<string>();
      const getDirective = (id: string) => {
        const d = this.directives.get(id);
        if (!d) {
          throw new Error("Invalid directive reference");
        }
        return d;
      };

      for (const node of newNodes) {
        debugTraceBegin("node", node);

        if (node.nodeType === Node.COMMENT_NODE) {
          const match = node.textContent?.match(/^denier-(\S+)$/);
          if (match) {
            const id = match[1];
            const d = getDirective(id);
            debugTraceBegin("directive", d.constructor.name);
            d.render(node as Comment);
            debugTraceEnd("directive");
            directivesDone.add(id);
          }
        } else {
          assert(node.nodeType === Node.ELEMENT_NODE);
          const elem = node as Element;

          for (const attr of elem.attributes) {
            const elementMatch = attr.name.match(/^denier-(\S+)$/);
            if (elementMatch) {
              const id = elementMatch[1];
              const d = getDirective(id);
              debugTraceBegin("directive", d.constructor.name);
              d.render(elem);
              debugTraceEnd("directive");
              directivesDone.add(id);
              if (!DEBUG) {
                elem.removeAttribute(attr.name);
              }
              continue;
            }

            const valueMatch = attr.value.match(/<!--denier-(\S+)-->/m);
            if (valueMatch) {
              const id = valueMatch[1];
              const setter = new AttributeSetter(attr.name, getDirective(id));
              this.directives.set(id, setter);
              debugTraceBegin("directive", "AttributeSetter");
              setter.render(elem);
              debugTraceEnd("directive");
              directivesDone.add(id);
            }
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

      return this;
    } catch (err) {
      debugTraceException(err);
      throw err;
    }
  }

  get isRendered(): boolean {
    return !!this.rendered;
  }

  get renderedResult(): RenderResult {
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
  // ??? Replace with observer?
  cleanup<T>(handler: (o: T) => void, target?: T): this {
    if (this.cleanupHandler) {
      throw new Error("Can only register one cleanup handler");
    }
    this.cleanupHandler = handler;
    this.cleanupTarget = target;
    this.cleanupTimer = setInterval(() => {
      const disconnected = (this.rendered || []).every(
        (node) => !node.isConnected
      );
      if (disconnected) {
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
    host.replaceWith(...this.rendered);
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
