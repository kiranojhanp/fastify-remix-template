import url from "node:url";
import fs from "node:fs";
import { createRequestHandler, getEarlyHintLinks } from "@mcansh/remix-fastify";
import { ServerBuild, broadcastDevReady } from "@remix-run/node";

import type {
  GetLoadContextFunction,
  RequestHandler,
} from "@mcansh/remix-fastify";

let BUILD_PATH = "./index.js";
let VERSION_PATH = "./version.txt";

const createDevRequestHandler = async (
  initialBuild: ServerBuild,
  getLoadContext?: GetLoadContextFunction
): Promise<RequestHandler> => {
  let build = initialBuild;

  async function handleServerUpdate() {
    // 1. re-import the server build
    build = await reimportServer();
    // 2. tell Remix that this app server is now up-to-date and ready
    await broadcastDevReady(build);
  }

  let chokidar = await import("chokidar");
  chokidar
    .watch(VERSION_PATH, { ignoreInitial: true })
    .on("add", handleServerUpdate)
    .on("change", handleServerUpdate);

  return async (request, reply) => {
    let links = getEarlyHintLinks(request, build);
    await reply.writeEarlyHintsLinks(links);

    return createRequestHandler({
      build: await build,
      getLoadContext,
      mode: "development",
    })(request, reply);
  };
};

const reimportServer = async (): Promise<ServerBuild> => {
  let stat = fs.statSync(BUILD_PATH);

  // convert build path to URL for Windows compatibility with dynamic `import`
  let BUILD_URL = url.pathToFileURL(BUILD_PATH).href;

  // use a timestamp query parameter to bust the import cache
  return import(BUILD_URL + "?t=" + stat.mtimeMs);
};

export { BUILD_PATH, createDevRequestHandler, reimportServer };
