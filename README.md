# Denier - a tiny lib for weaving web apps. :thread:

**Denier** is a tiny library for building web frontend stuff.

_Yes — it's yet another kind-of reactive web-UI library.
I guess we should throw in "opiniated" too._

**Denier** has templates, events, context-provided objects, state, efficient DOM updates, typed styles et.c.

All in about 850 lines of code, with no external run-time dependencies.
The minimized and gzipped version (why do we still list this?) is about 3k.

- Simple life-cycle, no magic.
- No extra DOMs or diffing.
- Mixes well with other libraries and frameworks.
- No special syntax, just plain HTML and Javascript/Typescript.
- Nice debug helpers

The name "Denier" refers to the unit for tiny thread sizes, and the fact that we deny the existence of all other similar frameworks. Or not. It's just a name. :socks:

## Getting started

### Basics

A Denier template is created using `html` - tagged strings:

```typescript
const message = "Hello, world!";
const template = html`
  <span>${message}</span>
`;
```

Templates are rendered into host tags:

```html
<body>
  <div id="my-app"></div>
</body>
```

```typescript
const host = document.getElementById("my-app");
template.render(host!);
```

This would result in the following:

```html
<body>
  <span>Hello, world!</span>
</body>
```

> Note that the template replaces the host tag!

### Examples

- [basic template use](example/basics.ts)
- [component style use](example/component.ts)
- [state provisioning and rebuilds](example/state.ts)

### Sub templates / components

By using a template within another template, we have a simple method for creating components:

```typescript
function title(t) {
  return html`<h2>${t}</h2>`;
}

const template = html`
  <div>${title("Hello!")}</div>
`;
```

### Template lifecycle

Templates are plain Javascript raw strings with interpolated values. Once created, they are static.

Templates can have dynamic parts by using functions or directives as interpolated values:

```typescript
const now = () => new Date().toLocaleString("sv");
const dynamic = html`
  <span>${now}</span>
`;
```

However, templates are not updated just because time passes. That's what the template `update()` method is for.

By calling `update()`, the template and interpolated values are re-evaluated and updated in place.

Updating a template is shallow - sub-templates are not updated when the parent template is.

### Events

Denier has a simple attribute directive for adding event handlers:

```typescript
function doStuff(e) {
  // Stuff being done here
}

const button = html`
  <button ${on("click", (e) => doStuff(e))}>PRESS ME</button>
`;
```

### Keyed lists

List items can be keyed to allow for efficient update handling:

```typescript
const list = html`
  <ul>${items.map((item) => html`<li>${item.name}</li>`.key(item.id))}</ul>
`
```

### "Reactive" components and state

- state in, UI out
- events in, state out

TBW

### Cleanup

- Cleanup handler

TBW

### Directives

#### `on`

The `on` directive registers event handlers, as described in [Events](#events) above.

#### `ref`

Use `ref` to get a reference to an HTML element:

```html
<div ${ref((e) => doStuffWithElement(e))}></div>
```

#### `flag`

The `flag` directive sets or resets a boolean HTML attribute:

```html
<div ${flag("visible", false)}></div>
```

#### `provide`

The `provide` directive injects an object instance into the DOM context,
making it available to sub-elements:

```typescript
html`
  <div
    ${
      provide(() => new MyObject())
    }
  >
  <!-- ... -->
  </div>
`;
```

#### `using`

The `using` directive looks up the closest provided object in the DOM context:

```typescript
html`
    ${
      using(
        MyObject,
        (o) => html`The object can be accessed here: ${o.someProperty}`
      )
    }
`;
```

Note that the template is not rebuilt when the provided object is updated.
Since the provided object can be of any type, it is not even a well-defined
what "updated" means.

For this, you need Denier state objects.

#### `build` and state objects

To get automatic builds on state changes, `provide` an object that extends `DenierState`:

```typescript
class CounterState extends DenierState<{ count: number }> {
  constructor() {
    super({ count: 42 });
  }
}
```

Then use the `build` directive:

```typescript
html`
    ${
      // Build a template, initialized with the provided state.
      // The template gets updated on state changes.
      build(
        CounterState,
        (s) =>
          html`
            <div>
              Initial: ${s.get().count}, Current: ${() => s.get().count}
            </div>
          `
      )
    }
`;
```

> Note the difference between using static and dynamic evaluation to get the initial and current values.

#### `style`

TBW

## TODO

- More docs
- More tests and testing
- More examples
- HMR
