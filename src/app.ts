import {html, on}  from ".";

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
    frame.render(root!);
});
