import fs from "node:fs";
import sharp from "sharp";
import Image from "@11ty/eleventy-img";

// Test images, generated so the repo has no binary files
for (const [file, color] of [["a.png", "#3a7"], ["b.png", "#a37"]]) {
  if (!fs.existsSync(file)) {
    await sharp({
      create: { width: 1600, height: 900, channels: 3, background: color },
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

// Same two images, used twice each (e.g. on two pages)
for (const src of ["a.png", "b.png", "a.png", "b.png"]) {
  const start = Date.now();
  await Image(src, options);
  console.log(`${src}: ${Date.now() - start}ms`);
}

console.log("imgAttributes after:", options.htmlOptions.imgAttributes);
