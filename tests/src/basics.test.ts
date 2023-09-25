import { html } from "denier";

const hostDocument = `
<html>
<body>
  <div id="test-app"></div>
</body>
</html>
`;

describe("Basics", () => {
  let host: Element;

  beforeEach(() => {
    document.body.innerHTML = hostDocument;
    host = document.getElementById("test-app")!;
  });

  it("renders empty template into text node(s)", () => {
    html``.render(host);
    const children = document.body.childNodes;
    for (const child of children) {
      expect(child.nodeType).toBe(Node.TEXT_NODE);
    }
  });

  it("renders plain text template into text node(s)", () => {
    html`test`.render(host);
    const children = document.body.childNodes;
    for (const child of children) {
      expect(child.nodeType).toBe(Node.TEXT_NODE);
    }
  });

  it("does not re-render static templates", () => {
    const t = html`<div id="4711">Content</div>`.render(host);
    const node = document.getElementById("4711");
    expect(node).toBeTruthy();
    t.update();
    const updated = document.getElementById("4711");
    expect(updated).toBeTruthy();
    expect(node).toBe(updated);
  });

  it("does not re-render static directive templates", () => {
    const content = "Content";
    const t = html`<div id="4711">${content}</div>`.render(host);
    const node = document.getElementById("4711");
    expect(node).toBeTruthy();
    t.update();
    const updated = document.getElementById("4711");
    expect(updated).toBeTruthy();
    expect(node).toBe(updated);
  });

  it("does not re-render unchanged dynamic directive templates", () => {
    const content = "Content";
    const t = html`<div id="4711">${() => content}</div>`.render(host);
    const node = document.getElementById("4711");
    expect(node).toBeTruthy();
    t.update();
    const updated = document.getElementById("4711");
    expect(updated).toBeTruthy();
    expect(node).toBe(updated);
  });

  it("does re-render changed dynamic directive templates", () => {
    let content = "Content";
    const t = html`<div id="4711">${() => content}</div>`.render(host);
    const node = document.getElementById("4711");
    expect(node).toBeTruthy();
    content = "Changed";
    t.update();
    const updated = document.getElementById("4711");
    expect(updated).toBeTruthy();
    expect(node).not.toBe(updated);
    expect(updated?.textContent).toBe(content);
  });

});
