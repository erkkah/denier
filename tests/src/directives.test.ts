import { html, on } from "denier";

const hostDocument = `
<html>
<body>
  <div id="test-app"></div>
</body>
</html>
`;

describe("Directives", () => {
  let host: Element;

  beforeEach(() => {
    document.body.innerHTML = hostDocument;
    host = document.getElementById("test-app")!;
  });

  it("renders event directive", () => {
    let clicked = false;
    const onClick = () => clicked = true;
    html`<button ${on("click", onClick)} id="mybutton">OK</button>`.render(host);
    const [button] = document.body.getElementsByTagName("button");
    expect(button).toBeTruthy();
    button.click();
    expect(clicked).toBeTruthy();
  });
});
