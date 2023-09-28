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
    expect(updated?.textContent).toBe(content);
  });
});

describe("Attribute values", () => {
  let host: Element;

  beforeEach(() => {
    document.body.innerHTML = hostDocument;
    host = document.getElementById("test-app")!;
  });

  it("renders static attribute values", () => {
    const value = 4711;
    const t = html`<div id="${value}">Content</div>`.render(host);
    const node = document.getElementById("4711");
    expect(node).toBeTruthy();
    t.update();
    const updated = document.getElementById("4711");
    expect(updated).toBeTruthy();
    expect(node).toBe(updated);
  });

  it("renders dynamic attribute values", () => {
    let value = 4711;
    const t = html`<div id="${() => value}">Content</div>`.render(host);
    const node = document.getElementById("4711");
    expect(node).toBeTruthy();
    value++;
    t.update();
    const updated = document.getElementById("4712");
    expect(updated).toBeTruthy();
    expect(updated).toBe(node);
  });

  it("fails to render unquoted dynamic attribute values", () => {
    let value = 4711;
    expect(() =>
      html`<div id=${() => value}>Content</div>`.render(host)
    ).toThrowError("Template error");
  });

  describe("Elements", () => {
    let host: Element;

    beforeEach(() => {
      document.body.innerHTML = hostDocument;
      host = document.getElementById("test-app")!;
    });

    it("renders static elements", () => {
      const content = "Content";
      const t = html`<div id="4711">${content}</div>`.render(host);
      const node = document.getElementById("4711");
      expect(node).toBeTruthy();
      expect(node?.textContent).toBe(content);
    });

    it("fails to render replacements in tags", () => {
      const tag = "div";
      expect(
        () => html`<${tag} id="4711">Content</${tag}>`.render(host)
      ).toThrowError("Template error");
    });

    it("fails to render dynamic tag names", () => {
      const tag = "div";
      expect(() =>
        html`<${() => tag} id="4711">Content</${() => tag}>`.render(host)
      ).toThrowError("Template error");
    });

    it("renders static plain html as string", () => {
      const content = `<a>Link</a>`;
      const t = html`<div id="4711">${content}</div>`.render(host);
      const node = document.getElementById("4711");
      expect(node).toBeTruthy();
      expect(node?.children).toHaveLength(0);
      expect(node?.innerHTML).toBe("&lt;a&gt;Link&lt;/a&gt;");
    });

    it("renders dynamic plain html as string", () => {
      const content = `<a>Link</a>`;
      const t = html`<div id="4711">${() => content}</div>`.render(host);
      const node = document.getElementById("4711");
      expect(node).toBeTruthy();
      expect(node?.children).toHaveLength(0);
      expect(node?.innerHTML).toBe("&lt;a&gt;Link&lt;/a&gt;");
    });

    it("renders static sub-templates", () => {
      const content = html`<a href="google.com">Link</a>`;
      const t = html`<div id="4711">${content}</div>`.render(host);
      const node = document.getElementById("4711");
      expect(node).toBeTruthy();
      expect(node?.children).toHaveLength(1);
    });

    it("renders dynamic sub-templates", () => {
      const content = html`<a href="google.com">Link</a>`;
      const t = html`<div id="4711">${() => content}</div>`.render(host);
      const node = document.getElementById("4711");
      expect(node).toBeTruthy();
      expect(node?.children).toHaveLength(1);
    });
  });
});
