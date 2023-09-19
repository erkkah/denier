import { DenierComponent, DenierTemplate, html, on } from "../src";
import { StatefulDenierComponent, denierApp } from "../src/component";

class Label extends DenierComponent {
    constructor(private label: string){
        super();
    }

    override build = () => html`<h2>${this.label}</h2>     `;
}

class Counter extends StatefulDenierComponent {
    private count = 0;
    private timer: number;

    constructor() {
        super();
        this.timer = setInterval(() => {
            this.setState(() => this.count++);
        }, 1000);
    }

    override build(): DenierTemplate {
        return html`${() => this.count}`;
    }
}

class App extends DenierComponent {
    override build(): DenierTemplate {
        return html`
            ${new Label("Hello from component!")}
            ${new Counter()}
        `;
    }
}

const app = new App();

const button = html`<button ${on("click", () => {
    frame.update();
})}>KLICK</button>`;

const content = html`
    Lite text först
    <div>${"static"}</div>
    <div>${() => {
        console.log("rendering content template");
        return "dynamic";
    }}</div>
    <div a href=${`Hej`}></div>
    ${button}
`;

let counter = 0;

const frame = html`
<div>${() => counter++}</div>
${() => (counter < 3 ? content : "b")}
`;

content.cleanup(() => {
    console.log("Content cleanup");
});

addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("app");
    denierApp(app, root!);
    //denierApp(frame, root!);
});
