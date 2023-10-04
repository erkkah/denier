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
  private positions = new Map<Key, number>();
  private order: Key[] = [];

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
    this.order = [];
    this.positions.clear();
    this.keyed.clear();

    for (const item of this.items) {
      const d = makeDirective(item);
      const node = document.createComment("");
      const rendered = d.render(node);
      this.keyed.set(d.key, [d, rendered]);
      this.positions.set(d.key, this.order.length);
      this.order.push(d.key);
      nodes.push(...rendered);
    }

    this.marker.after(...nodes);

    return [this.marker];
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

  
  override update(): void {
    let cursor: ChildNode | null = this.marker;
    const removed = new Set(this.keyed.keys());

    const target = [...this.items].map((d) => makeDirective(d));

    let q = 0;

    const newOrder: Key[] = [];

    while (q < target.length) {
      // ??? Use DocumentFragment instead?
      const newItems: ChildNode[] = [];
      let matchPosition: number | undefined;

      while (
        q < target.length &&
        (matchPosition = this.positions.get(target[q].key)) === undefined
      ) {
        const d = target[q];

        const node = document.createComment("");
        const rendered = d.render(node);
        this.keyed.set(d.key, [d, rendered]);
        this.positions.set(d.key, newOrder.length);
        newOrder.push(d.key);
        newItems.push(...rendered);
        q++;
      }

      if (newItems.length > 0) {
        cursor!.after(...newItems);
        cursor = newItems.pop()!;
        newItems.splice(0);
      }

      if (matchPosition !== undefined) {
        let length = 1;
        const matchedKey = this.order[matchPosition];
        this.positions.set(matchedKey, newOrder.length);
        newOrder.push(matchedKey);
        removed.delete(matchedKey);
        this.keyed.get(matchedKey)![0].update();

        while (
          ++q < target.length &&
          this.order[matchPosition + length] === target[q].key
        ) {
          const matchedKey = this.order[matchPosition + length];
          this.positions.set(matchedKey, newOrder.length);
          newOrder.push(matchedKey);
          removed.delete(matchedKey);
          this.keyed.get(matchedKey)![0].update();
          length++;
        }

        const matchStartKey = this.order[matchPosition];
        const [, matchStart] = this.keyed.get(matchStartKey)!;
        const matchEndKey = this.order[matchPosition + length - 1];
        const [, matchEnd] = this.keyed.get(matchEndKey)!;

        if (cursor.nextSibling !== matchStart[0]) {
          const match = document.createRange();
          match.setStartBefore(matchStart[0]);
          match.setEndAfter(matchEnd[matchEnd.length - 1]);
  
          const matchingNodes = match.extractContents();
          cursor.after(matchingNodes);
        }
        cursor = matchEnd[matchEnd.length - 1];
      }
    }

    this.order = newOrder;

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
