// A class-based implementation of "basics.ts", showing
// how to use stateless and stateful components.

import {
  DenierComponent,
  DenierTemplate,
  StatefulDenierComponent,
  denierApp,
  html,
  on,
} from "../src";

class Counter extends StatefulDenierComponent {
  private count = 42;

  constructor() {
    super();

    setInterval(
      () =>
        // `setState` is asynchronous
        this.setState(() => {
          this.count++;
        }),
      500
    );
  }

  resetCount() {
    this.setState(() => (this.count = 0));
  }

  // `build` gets called once to produce the component's template.
  // The template is then updated (re-evaluated) on each state update.
  override build(): DenierTemplate {
    return html`
      <div>Initial: ${this.count}, Current: ${() => this.count}</div>
    `;
  }
}

class App extends DenierComponent {
  // `build` gets called once to produce the component's template.
  override build(): DenierTemplate {
    const counter = new Counter();

    const button = html`
      <button ${on("click", () => counter.resetCount())}>Reset</button>
    `;

    return html` ${counter} ${button} `;
  }
}

addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("component-app");
  const app = new App();
  denierApp(app, root!);
});
