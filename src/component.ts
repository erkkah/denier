import { DenierComponent, DenierTemplate, html } from "./template";

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
