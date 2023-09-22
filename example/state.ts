// A version of "basics.ts" using state and provider.

import {
  DenierState,
  build,
  denierApp,
  html,
  on,
  provide,
  using,
} from "../src";

// A state holding our counter value.
class CounterState extends DenierState<{ count: number }> {
  constructor() {
    super({ count: 42 });
  }
}

const app = html`
  <div
    ${
      // Use the `provide` attribute directive to make the state
      // available for child nodes to consume.
      provide(() => {
        const state = new CounterState();
        setInterval(() => state.set({ count: state.get().count + 1 }), 500);
        return state;
      })
    }
  >
    ${
      // Build a template, initiated with the provided state.
      // The template gets updated on state changes.
      build(
        CounterState,
        (s) =>
          html`
            <div>
              Initial: ${s.get().count}, Current: ${() => s.get().count}
            </div>
          `
      )
    }
    ${
      // Build a template using a provided object. In this case,
      // it's our state.
      using(
        CounterState,
        (s) => html` <button ${on("click", () => s.update({ count: 0 }))}>
          Reset
        </button>`
      )
    }
  </div>
`;

addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("state-app");
  denierApp(app, root!);
});
