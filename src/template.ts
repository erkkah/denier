import {
  DEBUG,
  assert,
  debugShowTemplateError,
  debugTraceBegin,
  debugTraceEnd,
  debugTraceException,
} from "./debug";
import { DenierDirective, Key, RenderResult } from "./directives";
import { randomID } from "./id";
import { AttributeSetter, makeDirective } from "./internaldirectives";
import { DenierStylesheet } from "./style";

export class DenierTemplate {
  private _ID = "";
  private _shadowHost?: HTMLDivElement | HTMLSpanElement;
  private _styleCode?: string;

  get ID(): string {
    if (this._ID === "") {
      this._ID = randomID();
    }
    return this._ID;
  }

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
      t.innerHTML = this.code + (this._styleCode ? `<style>${this._styleCode}</style>`: "");
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

      let lastRendered: RenderResult = [];

      for (const node of newNodes) {
        debugTraceBegin("node", node);

        if (node.nodeType === Node.COMMENT_NODE) {
          const match = node.textContent?.match(/^denier-(\S+)$/);
          if (match) {
            const id = match[1];
            const d = getDirective(id);
            debugTraceBegin("directive", d.constructor.name);
            lastRendered = d.render(node as Comment);
            debugTraceEnd("directive");
            directivesDone.add(id);
          }
        } else {
          assert(node.nodeType === Node.ELEMENT_NODE);
          const elem = node as Element;

          for (const attr of [...elem.attributes]) {
            const elementMatch = attr.name.match(/^denier-(\S+)$/);
            if (elementMatch) {
              const id = elementMatch[1];
              const d = getDirective(id);
              debugTraceBegin("directive", d.constructor.name);
              lastRendered = d.render(elem);
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
        if (DEBUG) {
          const found = [...this.directives.entries()].find(
            ([id, _directive]) => !directivesDone.has(id)
          );
          debugShowTemplateError(
            this.rendered,
            lastRendered,
            found![1],
            this.code
          );
        }
        throw new Error("Template syntax error");
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
  private mount(host: ChildNode) {
    if (!this.rendered) {
      throw new Error("Cannot mount unrendered template");
    }
    if (this._shadowHost) {
      const shadow = this._shadowHost.attachShadow({ mode: "open" });
      shadow.append(...this.rendered);
      host.replaceWith(this._shadowHost);
      this.rendered = [this._shadowHost];
    } else {
      host.replaceWith(...this.rendered);
    }
  }

  shadow(kind: "div" | "span" = "div"): this {
    if (this._shadowHost) {
      throw new Error("Shadow host already created");
    }
    if (this.rendered) {
      throw new Error("Cannot create shadow host after rendering");
    }
    this._shadowHost = document.createElement(kind);
    return this;
  }

  style(style: DenierStylesheet): this {
    if (!this._shadowHost) {
      throw new Error("Cannot apply style without shadow root.");
    }
    this._styleCode = style.code();
    return this;
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
