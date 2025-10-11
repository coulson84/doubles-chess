import devtoolsJson from "vite-plugin-devtools-json";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import type { IncomingMessage } from "http";
import type { Duplex } from "stream";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: "node_modules/cm-chessboard/assets",
          dest: "games",
        },
      ],
    }),
    sveltekit(),
    devtoolsJson(),
    {
      name: "websocket",
      configureServer(server) {
        server.httpServer?.on(
          "upgrade",
          async (request: IncomingMessage, socket: Duplex, head: Buffer) => {
            if (request.url?.startsWith("/ws")) {
              try {
                // Import dynamically to avoid build issues
                const { handleUpgrade } = await import(
                  "./src/lib/websocket/server.js"
                );

                // For now, extract user ID from query param for simplicity
                // In production, parse the session cookie properly
                const url = new URL(
                  request.url,
                  `http://${request.headers.host}`
                );
                const userId = url.searchParams.get("userId");

                if (!userId) {
                  socket.destroy();
                  return;
                }

                handleUpgrade(request, socket, head, userId);
              } catch (error) {
                console.error("WebSocket upgrade error:", error);
                socket.destroy();
              }
            }
          }
        );
      },
    },
  ],
});
