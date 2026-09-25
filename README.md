# eleventy-img: `htmlOptions.imgAttributes` gets mutated, breaking the in-memory cache

Version: `@11ty/eleventy-img` 7.0.0 (also on `main` as of 2026-09-25)

## What happens

If you pass `htmlOptions.imgAttributes`, eleventy-img writes the source path of each processed image into that object. The object is part of the in-memory cache key, so the key keeps changing and the same image gets processed again.

The output is correct, builds are just slower. It shows up whenever the same image is used more than once in a build, for example an image in a layout, a post image that also appears on a listing page, or running the transform on feed content with `renderTransforms`.

In my site's build, 21 images were processed 63 times (page + Atom feed + JSON feed) and the build went from ~10s to ~30s.

## Repro

```
npm install
node repro.js
```

`repro.js` processes two images twice each with the same options object.

Output on 7.0.0:

```
a.png: 310ms
b.png: 308ms
a.png: 311ms   <- should be a cache hit
b.png: 0ms
imgAttributes after: { loading: 'lazy', src: 'a.png' }
```

Whether a call hits the cache depends on which image was processed before it.

With the fix below:

```
a.png: 301ms
b.png: 306ms
a.png: 0ms
b.png: 0ms
imgAttributes after: { loading: 'lazy' }
```

## Cause

`src/image.js`, `#finalizeResults()`:

```js
let imgAttributes = this.options.htmlOptions?.imgAttributes || {};
imgAttributes.src = this.src;
```

This modifies the user's object instead of a copy.

## Fix

```diff
-    let imgAttributes = this.options.htmlOptions?.imgAttributes || {};
+    let imgAttributes = Object.assign({}, this.options.htmlOptions?.imgAttributes);
     imgAttributes.src = this.src;
```

## Workaround

Pass the attributes as `defaultAttributes` instead of `htmlOptions.imgAttributes`, and set `htmlOptions: {}`. `defaultAttributes` is only read, never written.
