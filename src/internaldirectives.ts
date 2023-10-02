import { DenierComponent } from "./component";
import { DEBUG, assert } from "./debug";
import { DenierDirective, Key, RenderResult } from "./directives";
import { DenierTemplate } from "./template";

export function makeDirective(value: any): DenierDirective {
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

    for (const item of this.items) {
      const d = makeDirective(item);
      const node = document.createComment("");
      const rendered = d.render(node);
      this.keyed.set(d.key, [d, rendered]);
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

export class AttributeSetter extends DenierDirective {
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
