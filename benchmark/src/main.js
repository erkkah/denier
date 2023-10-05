import { html, on } from "../../src/index.ts";

let data = {
  items: [],
  selected: undefined,
};

let rowId = 1;
const add = () => {
  console.time("add 1000");
  data.items = data.items.concat(buildData(1000));
  template.update();
  console.timeEnd("add 1000");
};

const clear = () => {
  console.time("clear");
  data.items = [];
  data.selected = undefined;
  template.update();
  console.timeEnd("clear");
};

const partialUpdate = () => {
  console.time("update");
  for (let i = 0; i < data.items.length; i += 10) {
    data.items[i].label += " !!!";
  }
  template.update();
  console.timeEnd("update");
};

const remove = (num) => {
  console.time("remove");
  const idx = data.items.findIndex((d) => d.id === num);
  data.items.splice(idx, 1);
  template.update();
  console.timeEnd("remove");
};

const run = () => {
  console.time("create 1000");
  data.items = buildData(1000);
  data.selected = undefined;
  template.update();
  console.timeEnd("create 1000");
};

const runLots = () => {
  console.time("create 10000");
  data.items = buildData(10000);
  data.selected = undefined;
  template.update();
  console.timeEnd("create 10000");
};

const select = (id) => {
  console.time("select");
  data.selected = id;
  template.update();
  console.timeEnd("select");
}

const swapRows = () => {
  console.time("swap");
  if (data.items.length > 3) {
    data.items = [
      data.items[0],
      data.items[data.items.length - 2],
      ...data.items.slice(2, data.items.length - 2),
      data.items[1],
      data.items[data.items.length - 1],
    ];
    template.update();
  }
  console.timeEnd("swap");
};

function _random(max) {
  return Math.trunc(Math.random() * max);
}

async function stress() {
  const operations = [swapRows, select, runLots, run, remove, partialUpdate, clear, add];

  for (let i = 0; i < 100; i++) {
    const operation = new Promise((resolve, reject) => {
      try {
        operations[_random(operations.length)]();
        resolve();
      } catch (err) {
        reject(err);
      }
    });
    await operation;
  }
};

function buildData(count = 1000) {
  const adjectives = [
      "pretty",
      "large",
      "big",
      "small",
      "tall",
      "short",
      "long",
      "handsome",
      "plain",
      "quaint",
      "clean",
      "elegant",
      "easy",
      "angry",
      "crazy",
      "helpful",
      "mushy",
      "odd",
      "unsightly",
      "adorable",
      "important",
      "inexpensive",
      "cheap",
      "expensive",
      "fancy",
    ],
    colours = [
      "red",
      "yellow",
      "blue",
      "green",
      "pink",
      "brown",
      "purple",
      "brown",
      "white",
      "black",
      "orange",
    ],
    nouns = [
      "table",
      "chair",
      "house",
      "bbq",
      "desk",
      "car",
      "pony",
      "cookie",
      "sandwich",
      "burger",
      "pizza",
      "mouse",
      "keyboard",
    ],
    data = new Array(count);
  for (var i = 0; i < count; i++)
    data[i] = {
      id: rowId++,
      label:
        adjectives[_random(adjectives.length)] +
        " " +
        colours[_random(colours.length)] +
        " " +
        nouns[_random(nouns.length)],
    };
  return data;
}

const template = html`<div>
  <div class="jumbotron">
    <div class="row">
      <div class="col-md-6">
        <h1>Denier (keyed)</h1>
      </div>
      <div class="col-md-6">
        <div class="row">
          <div class="col-sm-6 smallpad">
            <button
              type="button"
              class="btn btn-primary btn-block"
              id="run"
              ${on("click", run)}
            >
              Create 1,000 rows
            </button>
          </div>
          <div class="col-sm-6 smallpad">
            <button
              type="button"
              class="btn btn-primary btn-block"
              id="runlots"
              ${on("click", runLots)}
            >
              Create 10,000 rows
            </button>
          </div>
          <div class="col-sm-6 smallpad">
            <button
              type="button"
              class="btn btn-primary btn-block"
              id="add"
              ${on("click", add)}
            >
              Append 1,000 rows
            </button>
          </div>
          <div class="col-sm-6 smallpad">
            <button
              type="button"
              class="btn btn-primary btn-block"
              id="update"
              ${on("click", partialUpdate)}
            >
              Update every 10th row
            </button>
          </div>
          <div class="col-sm-6 smallpad">
            <button
              type="button"
              class="btn btn-primary btn-block"
              id="clear"
              ${on("click", clear)}
            >
              Clear
            </button>
          </div>
          <div class="col-sm-6 smallpad">
            <button
              type="button"
              class="btn btn-primary btn-block"
              id="swaprows"
              ${on("click", swapRows)}
            >
              Swap Rows
            </button>
          </div>
          <div class="col-sm-6 smallpad">
            <button
              type="button"
              class="btn btn-primary btn-block"
              id="stress"
              ${on("click", stress)}
            >
              Stress!
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <table class="table table-hover table-striped test-data">
    <tbody>
      ${() =>
        data.items.map(
          (row) => html`<tr
            class="${() => (data.selected === row.id ? "danger" : "")}"
          >
            <td class="col-md-1">${row.id}</td>
            <td class="col-md-4">
              <a ${on("click", () => select(row.id))}>${() => row.label}</a>
            </td>
            <td class="col-md-1">
              <a ${on("click", () => remove(row.id))}>
                <span class="glyphicon glyphicon-remove" aria-hidden="true" />
              </a>
            </td>
            <td class="col-md-6" />
          </tr>`.key(row.id)
        )}
    </tbody>
  </table>
</div> `.render(document.getElementById("denier"));
