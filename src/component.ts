import { ElementDirective } from "./directives";
import { DenierTemplate, html } from "./template";

export abstract class DenierComponent extends ElementDirective {
  private _template?: DenierTemplate;

  get template(): DenierTemplate {
    if (!this._template) {
      this._template = this.build();
    }
    return this._template;
  }

  override process(host: Element): ChildNode {
    const t = this.template;
    if (t.isRendered) {
      t.mount(host);
    } else {
      t.render(host);
    }
    return t.renderedNode;
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
