import { denierApp, html, on } from "../src";

let value = 0;

const counter = html`${() => value}`;

setInterval(() => {
    value++;
    counter.update();
}, 250);

const app = html`
    <div>${counter}</div>
    <button
        ${on("click", () => {
            value = 0;
            counter.update();
        })}
    >
        Reset
    </button>
`;

addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("app");
    denierApp(app, root!);
});
