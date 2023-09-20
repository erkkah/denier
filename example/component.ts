import {
    DenierTemplate,
    StatefulDenierComponent,
    denierApp,
    html,
    on,
} from "../src";

class App extends StatefulDenierComponent {
    private count = 0;

    constructor() {
        super();

        setInterval(
            () =>
                this.setState(() => {
                    this.count++;
                }),
            250
        );
    }

    override build(): DenierTemplate {
        const button = html`
            <button ${on("click", () => this.setState(() => (this.count = 0)))}>
                Reset
            </button>
        `;

        return html`
            <div>${() => this.count}</div>
            ${button}
        `;
    }
}

addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("app");
    const app = new App();
    denierApp(app, root!);
});
