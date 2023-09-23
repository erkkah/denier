import { DenierDirective } from "./directives";
import { randomID } from "./id";
import { DenierTemplate, html } from "./template";

export abstract class DenierComponent extends DenierDirective {
  private ID = randomID("component");
  private _template?: DenierTemplate;

  get template(): DenierTemplate {
    // ??? Catch errors
    if (!this._template) {
      this._template = this.build();
    }
    return this._template;
  }

  override value(): string {
    return `<div id="${this.ID}"></div>`;
  }

  override render(parent: Element) {
    const host = (parent as HTMLDivElement).querySelector("#" + this.ID);
    if (!host) {
      throw new Error(`Invalid nested template`);
    }

    const t = this.template;
    if (t.isRendered) {
      t.mount(host);
    } else {
      t.render(host);
    }
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
