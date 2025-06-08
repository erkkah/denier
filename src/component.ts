import { ElementDirective, RenderResult } from "./directives";
import { DenierTemplate, html } from "./template";

export abstract class DenierComponent extends ElementDirective {
  override get ID(): string {
    return this.template.ID;
  }

  private _template?: DenierTemplate;

  get template(): DenierTemplate {
    if (!this._template) {
      this._template = this.build();
    }
    return this._template;
  }

  override process(host: Element): RenderResult {
    const t = this.template;
    if (t.isRendered) {
      if (!t.isConnected) {
        t.mount(host);
      }
      t.update();
    } else {
      t.render(host);
    }
    return t.renderedResult;
  }

  override update(): void {
      this.template.update();
  }

  /**
   * Gets called _once_ to build the component template.
   */
  abstract build(): DenierTemplate;
}

export abstract class StatefulDenierComponent extends DenierComponent {
  protected setState(setter: () => void) {
    setTimeout(() => {
      setter();
      this.template.update();
    });
  }
}

export function denierApp(
  app: DenierComponent | DenierTemplate,
  root: Element
) {
  html`${app}`.render(root);
}
