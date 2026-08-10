import { readFile } from "node:fs/promises";
import https from "node:https";
import next from "next";

const certificatePath = process.env.LOCAL_TLS_CERT_PATH;
const keyPath = process.env.LOCAL_TLS_KEY_PATH;
const hostname = process.env.LOCAL_HTTPS_HOST ?? "0.0.0.0";
const port = Number(process.env.LOCAL_HTTPS_PORT ?? "3443");

if (!certificatePath || !keyPath) {
  throw new Error("LOCAL_TLS_CERT_PATH and LOCAL_TLS_KEY_PATH are required for the HTTPS server.");
}

const [cert, key] = await Promise.all([readFile(certificatePath), readFile(keyPath)]);
const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

https.createServer({ cert, key }, (request, response) => handle(request, response)).listen(port, hostname, () => {
  console.log(`Fitness PWA is available at https://${hostname}:${port}`);
});
