import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const nextDirectory = path.join(projectRoot, ".next");
const templatePath = path.join(projectRoot, "scripts", "service-worker-template.js");
const outputPath = path.join(projectRoot, "public", "sw.js");
const shellUrls = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png"
];

const [buildId, appHtml, template] = await Promise.all([
  readFile(path.join(nextDirectory, "BUILD_ID"), "utf8"),
  readFile(path.join(nextDirectory, "server", "app", "index.html"), "utf8"),
  readFile(templatePath, "utf8")
]);

const staticAssets = [...appHtml.matchAll(/(?:src|href)="(\/_next\/static\/[^"?#]+)(?:[?#][^"]*)?"/g)]
  .map((match) => match[1])
  .filter((url) => typeof url === "string");
const precacheUrls = [...new Set([...shellUrls, ...staticAssets])];
const normalizedBuildId = buildId.trim().replace(/[^A-Za-z0-9_-]/g, "");

if (!normalizedBuildId || staticAssets.length === 0) {
  throw new Error("Could not determine the Next.js build ID or initial route assets.");
}

const serviceWorker = template
  .replace("__FITNESS_BUILD_ID__", JSON.stringify(normalizedBuildId))
  .replace("__FITNESS_PRECACHE_URLS__", JSON.stringify(precacheUrls, null, 2));

if (serviceWorker.includes("__FITNESS_")) {
  throw new Error("Service worker template contains unresolved placeholders.");
}

await writeFile(outputPath, `${serviceWorker.trim()}\n`, "utf8");
console.log(`Generated public/sw.js with ${precacheUrls.length} files for build ${normalizedBuildId}.`);
