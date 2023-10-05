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
  private positionByKey = new Map<Key, number>();
  private keyByPosition: Key[] = [];

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
    this.keyByPosition.splice(0);
    this.positionByKey.clear();
    this.keyed.clear();

    for (const item of this.items) {
      const d = makeDirective(item);
      const node = document.createComment("");
      const rendered = d.render(node);
      this.keyed.set(d.key, [d, rendered]);
      const position = this.positionByKey.size;
      this.positionByKey.set(d.key, position);
      this.keyByPosition.push(d.key);
      nodes.push(...rendered);
    }

    this.marker.after(...nodes);

    return [this.marker];
  }

  private removeNodes(result: ChildNode[]): void {
    if (result.length > 0) {
      if (result.length > 100) {
        const marker = document.createElement("comment");
        const range = document.createRange();
        const parent = result[0].parentNode! as unknown as ChildNode;
        assert(parent.before);
        parent.before(marker);
        range.selectNode(parent);
        const disconnected = range.extractContents();
        result.forEach((r) => r.remove());
        marker.replaceWith(disconnected);
      } else {
        result.forEach((r) => r.remove());
      }
    }
  }

  override update(): void {
    let cursor: ChildNode | null = this.marker;

    const removed = new Set(this.keyed.keys());
    const removeOld = () => {
      const oldNodes: ChildNode[] = [];

      for (const key of removed) {
        const old = this.keyed.get(key);
        assert(old);
        const [_, result] = old;
        oldNodes.push(...result);
        this.keyed.delete(key);
        this.positionByKey.delete(key);
      }

      this.removeNodes(oldNodes);
    };

    const target = [...this.items].map((d) => makeDirective(d));
    for (const item of target) {
      if (removed.delete(item.key)) {
        this.keyed.get(item.key)![0].update();
      }
    }

    removeOld();

    let q = 0;

    // For all items in the target configuration
    while (q < target.length) {
      const newItems: ChildNode[] = [];
      let matchPosition: number | undefined;

      // Track a sequence of new items
      while (
        q < target.length &&
        (matchPosition = this.positionByKey.get(target[q].key)) === undefined
      ) {
        const d = target[q];

        const node = document.createComment("");
        const rendered = d.render(node);
        this.keyed.set(d.key, [d, rendered]);
        newItems.push(...rendered);
        q++;
      }

      // Insert the new items, if any
      if (newItems.length > 0) {
        cursor!.after(...newItems);
        cursor = newItems.pop()!;
        newItems.splice(0);
      }

      // We stopped finding new items above,
      // track sequence of existing items with same order in current
      // and target configurations.
      if (matchPosition !== undefined) {
        let length = 1;
        const matchStartKey = target[q].key;
        assert(this.keyed.has(matchStartKey), `${matchStartKey}`);

        let matchEndKey = matchStartKey;

        while (
          ++q < target.length &&
          this.keyByPosition[matchPosition + length] === target[q].key
        ) {
          matchEndKey = target[q].key;
          length++;
        }

        const [, matchStart] = this.keyed.get(matchStartKey)!;
        const [, matchEnd] = this.keyed.get(matchEndKey)!;

        if (cursor.nextSibling !== matchStart[0]) {
          // Here, figure out if the range between cursor and match start is
          // smaller than the matching range. Then move the smallest range.
          const prefixStart = cursor.nextSibling!;
          let prefixEnd: Node | null = prefixStart;
          let prefixLength = 1;
          while (prefixEnd?.nextSibling && prefixEnd.nextSibling !== matchStart[0]) {
            prefixEnd = prefixEnd.nextSibling;
            prefixLength++;
          }

          const match = document.createRange();
          if (prefixEnd && prefixLength < length) {
            match.setStartBefore(prefixStart);
            match.setEndAfter(prefixEnd);
            const prefixNodes = match.extractContents();
            matchEnd[matchEnd.length - 1].after(prefixNodes);
          } else {
            match.setStartBefore(matchStart[0]);
            match.setEndAfter(matchEnd[matchEnd.length - 1]);

            const matchingNodes = match.extractContents();
            cursor.after(matchingNodes);
          }
        }
        cursor = matchEnd[matchEnd.length - 1];
      }
    }

    this.keyByPosition = target.map((item) => item.key);
    this.positionByKey = new Map(
      target.map((item, index) => [item.key, index])
    );
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
