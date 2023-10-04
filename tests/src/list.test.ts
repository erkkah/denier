import { html, on } from "denier";

const hostDocument = `
<html>
<body>
  <div id="test-app"></div>
</body>
</html>
`;

describe("List", () => {
  let host: Element;

  beforeEach(() => {
    document.body.innerHTML = hostDocument;
    host = document.getElementById("test-app")!;
  });

  it("renders static unkeyed list", () => {
    const list = [0, 1, 2, 3];
    html`<div id="4711">${list.map((i) => html`<i>${i}</i>`)}</div>`.render(
      host
    );
    const node = document.getElementById("4711");
    expect(node).toBeTruthy();
    expect(node?.childElementCount).toBe(4);
    expect(node?.children.item(0)?.textContent).toBe("0");
  });

  it("renders static keyed list", () => {
    const list = [0, 1, 2, 3];
    html`<div id="4711">
      ${list.map((i) => html`<i>${i}</i>`.key(i))}
    </div>`.render(host);
    const node = document.getElementById("4711");
    expect(node).toBeTruthy();
    expect(node?.childElementCount).toBe(4);
    expect(node?.children.item(0)?.textContent).toBe("0");
  });

  it("updates static unkeyed list", () => {
    const list = [0, 1, 2, 3];
    const t = html`<div id="4711">
      ${list.map((i) => html`<i>${i}</i>`)}
    </div>`.render(host);
    let node = document.getElementById("4711");
    expect(node).toBeTruthy();
    expect(node?.childElementCount).toBe(4);
    const beforeUpdate = [...node?.childNodes!];
    t.update();
    expect(document.getElementById("4711")).toBe(node);
    expect(node?.childElementCount).toBe(4);
    const afterUpdate = [...node?.childNodes!];
    expect(beforeUpdate).toEqual(afterUpdate);
  });

  it("updates static keyed list", () => {
    const list = [0, 1, 2, 3];
    const t = html`<div id="4711">
      ${list.map((i) => html`<i>${i}</i>`.key(i))}
    </div>`.render(host);
    let node = document.getElementById("4711");
    expect(node).toBeTruthy();
    expect(node?.childElementCount).toBe(4);
    const beforeUpdate = [...node?.childNodes!];
    t.update();
    expect(document.getElementById("4711")).toBe(node);
    expect(node?.childElementCount).toBe(4);
    const afterUpdate = [...node?.childNodes!];
    expect(beforeUpdate).toEqual(afterUpdate);
  });

  it("renders dynamic keyed list", () => {
    const list = [0, 1, 2, 3];
    html`<div id="4711">
      ${() => list.map((i) => html`<i>${i}</i>`.key(i))}
    </div>`.render(host);
    const node = document.getElementById("4711");
    expect(node).toBeTruthy();
    expect(node?.childElementCount).toBe(4);
    expect(node?.children.item(0)?.textContent).toBe("0");
  });

  it("updates dynamic unchanged keyed list", () => {
    const list = [0, 1, 2, 3];
    const t = html`<div id="4711">
      ${() => list.map((i) => html`<i>${i}</i>`.key(i))}
    </div>`.render(host);
    let node = document.getElementById("4711");
    expect(node).toBeTruthy();
    expect(node?.childElementCount).toBe(4);
    const beforeUpdate = [...node?.childNodes!];
    t.update();
    expect(document.getElementById("4711")).toBe(node);
    expect(node?.childElementCount).toBe(4);
    const afterUpdate = [...node?.childNodes!];
    expect(beforeUpdate).toEqual(afterUpdate);
  });

  it("handles single element update", () => {
    const list = [0, 1, 2, 3];
    const t = html`<div id="4711">
      ${() => list.map((i) => html`<i>${i}</i>`.key(i))}
    </div>`.render(host);
    let node = document.getElementById("4711");
    expect(node).toBeTruthy();
    expect(node?.childElementCount).toBe(4);
    const beforeUpdate = [...node?.children!];
    expect(beforeUpdate[0].textContent).toBe("0");

    list[0] = 4;
    t.update();
    expect(document.getElementById("4711")).toBe(node);
    expect(node?.childElementCount).toBe(4);
    const afterUpdate = [...node?.children!];
    expect(beforeUpdate.slice(1)).toEqual(afterUpdate.slice(1));
    expect(beforeUpdate[1]).not.toEqual(afterUpdate[0]);
  });

  it("handles outer single element swap", () => {
    const list = [0, 1, 2, 3];
    const t = html`<div id="4711">
      ${() => list.map((i) => html`<i>${i}</i>`.key(i))}
    </div>`.render(host);
    let node = document.getElementById("4711");
    expect(node).toBeTruthy();
    expect(node?.childElementCount).toBe(4);
    const beforeUpdate = [...node?.children!];

    list[0] = 3;
    list[3] = 0;
    t.update();
    expect(document.getElementById("4711")).toBe(node);
    expect(node?.childElementCount).toBe(4);
    const afterUpdate = [...node?.children!];
    expect(beforeUpdate.slice(1, 3)).toEqual(afterUpdate.slice(1, 3));
    expect(beforeUpdate[0]).toEqual(afterUpdate[3]);
    expect(beforeUpdate[3]).toEqual(afterUpdate[0]);
  });

  it("handles inner single element swap", () => {
    const list = [0, 1, 2, 3];
    const t = html`<div id="4711">
      ${() => list.map((i) => html`<i>${i}</i>`.key(i))}
    </div>`.render(host);
    let node = document.getElementById("4711");
    expect(node).toBeTruthy();
    expect(node?.childElementCount).toBe(4);
    const beforeUpdate = [...node?.children!];

    list[1] = 2;
    list[2] = 1;
    t.update();
    expect(document.getElementById("4711")).toBe(node);
    expect(node?.childElementCount).toBe(4);
    const afterUpdate = [...node?.children!];
    expect(beforeUpdate[1]).toEqual(afterUpdate[2]);
    expect(beforeUpdate[2]).toEqual(afterUpdate[1]);
    expect(beforeUpdate[0]).toEqual(afterUpdate[0]);
    expect(beforeUpdate[3]).toEqual(afterUpdate[3]);
  });

  it("handles intermixed single element swap", () => {
    const list = [0, 1, 2, 3, 4];
    const t = html`<div id="4711">
      ${() => list.map((i) => html`<i>${i}</i>`.key(i))}
    </div>`.render(host);
    let node = document.getElementById("4711");
    expect(node).toBeTruthy();
    expect(node?.childElementCount).toBe(5);
    const beforeUpdate = [...node?.children!];

    list[1] = 3;
    list[3] = 1;
    t.update();
    expect(document.getElementById("4711")).toBe(node);
    expect(node?.childElementCount).toBe(5);
    const afterUpdate = [...node?.children!];
    expect(beforeUpdate[1]).toEqual(afterUpdate[3]);
    expect(beforeUpdate[3]).toEqual(afterUpdate[1]);
    expect(beforeUpdate[0]).toEqual(afterUpdate[0]);
    expect(beforeUpdate[2]).toEqual(afterUpdate[2]);
    expect(beforeUpdate[4]).toEqual(afterUpdate[4]);
  });

  it("handles benchmark swap", () => {
    interface item {
      id: string;
      data: number;
    }

    const makeItems = (num: number): item[] =>
      [...new Array(num)].map((_, i) => ({ id: "" + i, data: Math.random() }));

    let items: item[] = [];

    const t = html`
      <div id="4711">
        <table class="table table-hover table-striped test-data">
          <tbody>
            ${() =>
              items.map((row) =>
                html`<tr>
                  <td class="col-md-1">${row.id}</td>
                  <td class="col-md-4">${row.data}</td>
                </tr>`.key(row.id)
              )}
          </tbody>
        </table>
      </div>
    `;

    t.render(host);
    let node = document.getElementById("4711");

    items = makeItems(10);
    t.update();

    const beforeSwap = [...node?.children!];

    items = [
      items[0],
      items[items.length - 2],
      ...items.slice(2, items.length - 2),
      items[1],
      items[items.length - 1],
    ];

    t.update();

    expect(document.getElementById("4711")).toBe(node);
    const afterSwap = [...node?.children!];
    expect(beforeSwap[1]).toBe(afterSwap[items.length-2]);
  });
});
