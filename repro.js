import fs from "node:fs";
import sharp from "sharp";
import Image from "@11ty/eleventy-img";

const images = ["a.png", "b.png", "c.png"];

// Test images, generated so the repo has no binary files
for (const [i, file] of images.entries()) {
  if (!fs.existsSync(file)) {
    await sharp({
      create: { width: 1600, height: 900, channels: 3, background: ["#3a7", "#a37", "#37a"][i] },
    }).png().toFile(file);
  }
}

const options = {
  formats: ["avif"],
  widths: [800, 1600],
  dryRun: true,
  htmlOptions: {
    imgAttributes: { loading: "lazy" },
  },
};

// Use the same three images over and over, like pages sharing images.
// Each image only needs to be processed once, the rest should come from the cache.
for (let round = 1; round <= 4; round++) {
  console.log(`round ${round}`);
  for (const src of images) {
    const leftover = options.htmlOptions.imgAttributes.src ?? "-";
    const start = Date.now();
    await Image(src, options);
    console.log(`  ${src}  ${String(Date.now() - start).padStart(4)}ms   (imgAttributes.src was: ${leftover})`);
  }
}
