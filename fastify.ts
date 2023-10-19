import fastify from "fastify";
import {
  createRequestHandler,
  staticFilePlugin,
  getEarlyHintLinks,
} from "@mcansh/remix-fastify";
import {
  ServerBuild,
  broadcastDevReady,
  installGlobals,
} from "@remix-run/node";
import { fastifyEarlyHints } from "@fastify/early-hints";
import { BUILD_PATH, createDevRequestHandler } from "./utils.js";
import remixConfig from "./remix.config.js";

installGlobals();

let initialBuild: ServerBuild = await import(BUILD_PATH);
let handler: any;

if (process.env.NODE_ENV === "development") {
  handler = await createDevRequestHandler(initialBuild);
} else {
  handler = createRequestHandler({
    build: initialBuild,
    mode: initialBuild.mode,
  });
}

const app = fastify({
  logger: true,
});

let noopContentParser = (_request: any, payload: any, done: any) => {
  done(null, payload);
};

app.addContentTypeParser("application/json", noopContentParser);
app.addContentTypeParser("*", noopContentParser);

await app.register(fastifyEarlyHints, { warn: true });

// register remix.config
await app.register(staticFilePlugin, remixConfig);

app.all("*", async (request, reply) => {
  if (process.env.NODE_ENV === "production") {
    let links = getEarlyHintLinks(request, initialBuild);
    await reply.writeEarlyHintsLinks(links);
  }

  return handler(request, reply);
});

let port = process.env.PORT ? Number(process.env.PORT) || 3000 : 3000;

let address = await app.listen({ port, host: "0.0.0.0" });
console.log(`✅ app ready: ${address}`);

if (process.env.NODE_ENV === "development") {
  console.log("Hello");
}

if (process.env.NODE_ENV === "development") {
  await broadcastDevReady(initialBuild);
}
