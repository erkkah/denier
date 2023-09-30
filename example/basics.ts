// The basics of Denier - plain templates.

import { denierApp, html, on } from "../src";

// Here's our value
let value = 42;

// A template showing our value.
// Note the difference between using a static value and a function.
// The template is only parsed once, but functions and directives get evaluated
// if the template is updated.
const counter = html`<div>
  Initial: ${value}, Current:
  ${() => {
    //throw new Error("Test error");
    return value;
  }}
</div>`;

// The value gets increased, and the template is updated.
setInterval(() => {
  value++;
  counter.update();
}, 500);

// Main template with a reset button
const app = html`
  <span>${new Date().toLocaleString("sv")}</span>
  ${counter}
  <button
    ${on("click", () => {
      value = 0;
      counter.update();
    })}
  >
    Reset
  </button>
`;

// Mounting
addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("basic-app");
  denierApp(app, root!);
});
