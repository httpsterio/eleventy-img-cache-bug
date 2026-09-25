# eleventy-img: `htmlOptions.imgAttributes` gets mutated, breaking the in-memory cache

Version: `@11ty/eleventy-img` 7.0.0 (also on `main` as of 2026-09-25)

## What happens

When you set `htmlOptions.imgAttributes`, eleventy-img writes the path of the image it just processed into that object, as `imgAttributes.src`.

That object is part of the in-memory cache key. So the key for an image depends on which image was processed before it. Same image, different previous image: cache miss, and the image is encoded again.

The HTML output is correct. Builds are just slower whenever an image is used more than once, for example an image in a layout, a post image that also shows on a listing page, or running the transform on feed content with `renderTransforms`.

In my site's build, 21 images were encoded 63 times (page + Atom feed + JSON feed).

## Repro

```
npm install
node repro.js
```

`repro.js` uses three images four times each, with one shared options object. Each image should be encoded once (~300ms) and come from the cache after that (0ms).

Output on 7.0.0:

```
round 1
  a.png   321ms   (imgAttributes.src was: -)
  b.png   327ms   (imgAttributes.src was: a.png)
  c.png   306ms   (imgAttributes.src was: b.png)
round 2
  a.png   314ms   (imgAttributes.src was: c.png)
  b.png     1ms   (imgAttributes.src was: a.png)
  c.png   319ms   (imgAttributes.src was: a.png)
round 3
  a.png     0ms   (imgAttributes.src was: c.png)
  b.png   319ms   (imgAttributes.src was: c.png)
  c.png     0ms   (imgAttributes.src was: b.png)
round 4
  a.png   310ms   (imgAttributes.src was: b.png)
  b.png     0ms   (imgAttributes.src was: a.png)
  c.png     0ms   (imgAttributes.src was: a.png)
```

7 encodes instead of 3. An image is a cache hit only when `imgAttributes.src` holds the same leftover value as some earlier time that image was encoded. For example `b.png` in round 2 is a hit because it follows `a.png`, same as in round 1. `c.png` in round 2 is a miss because it now follows `a.png` instead of `b.png`.

With the fix below:

```
round 1
  a.png   320ms   (imgAttributes.src was: -)
  b.png   322ms   (imgAttributes.src was: -)
  c.png   311ms   (imgAttributes.src was: -)
round 2
  a.png     0ms   (imgAttributes.src was: -)
  b.png     0ms   (imgAttributes.src was: -)
  c.png     0ms   (imgAttributes.src was: -)
...
```

## Cause

`src/image.js`, `#finalizeResults()`:

```js
let imgAttributes = this.options.htmlOptions?.imgAttributes || {};
imgAttributes.src = this.src;
```

This writes into the user's object instead of a copy.

## Fix

```diff
-    let imgAttributes = this.options.htmlOptions?.imgAttributes || {};
+    let imgAttributes = Object.assign({}, this.options.htmlOptions?.imgAttributes);
     imgAttributes.src = this.src;
```

## Workaround

Pass the attributes as `defaultAttributes` instead of `htmlOptions.imgAttributes`, and set `htmlOptions: {}`. `defaultAttributes` is only read, never written.
