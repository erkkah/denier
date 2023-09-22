# Denier - a tiny lib for weaving web apps. :thread:

**Denier** is a tiny library for building web frontend stuff.

_Yes — it's yet another kind-of reactive web-UI library.
I guess we should throw in "opiniated" too._

**Denier** has templates, events, context-provided objects, state, efficient DOM updates, typed styles et.c.

All in less than 500 lines of Typescript, with no external run-time dependencies.
The minimized and gzipped version (why do we still list this?) is 1k.

- Simple life-cycle, no magic.
- No extra DOMs or diffing.
- Mixes well with other libraries and frameworks.
- No special syntax, just plain HTML and Javascript/Typescript.

The name "Denier" refers to the unit for tiny thread sizes, and the fact that we deny the existence of all other similar frameworks. Or not. It's just a name. :socks:

## TODO

- Debug helpers
- Tighter error handling

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
function doStuff() {
  // Stuff being done here
}

const button = html`
  <button ${on("click", doStuff)}>PRESS ME</button>
`;
```

### "Reactive" components and state

* state in, UI out
* events in, new state out

### Cleanup

* Cleanup handler

### Directives

* on
* ref
* provide
* using
* build

## User input and safety

* No "safe" or "raw" HTML input
