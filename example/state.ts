import {
    DenierState,
    build,
    denierApp,
    html,
    on,
    provide,
    using,
} from "../src";

class CounterState extends DenierState<{ count: number }> {
    constructor() {
        super({ count: 0 });
    }
}

const app = html`
    <div
        ${provide(() => {
            const state = new CounterState();
            setInterval(() => state.set({ count: state.get().count + 1 }), 250);
            return state;
        })}
    >
        ${build(CounterState, (s) => html` <div>${() => s.get().count}</div> `)}
        ${using(
            CounterState,
            (s) => html` <button ${on("click", () => s.update({ count: 0 }))}>
                Reset
            </button>`
        )}
    </div>
`;

addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("app");
    denierApp(app, root!);
});
