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

* state in, UI out
* events in, state out

TBW

### Cleanup

* Cleanup handler

TBW

### Directives

* on
* ref
* flag
* provide
* using
* build
* style

TBW

## User input and safety

* No "safe" or "raw" HTML input

TBW

## TODO

- More docs
- More tests and testing
- More examples
- HMR
