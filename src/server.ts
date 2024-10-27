import http from "http";
import WebSocket from "ws";
import { MessageService } from "./services/messageService";
import cors from "cors";
import { upgradeMiddleware } from "./middleware/upgradeMiddleware";
import messageRoutes from "./routes/messageRoutes";

import { JoinMessage, RegularMessage } from "./types/types";

const PORT = process.env.PORT || 3000;


const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url?.startsWith("/messages")) {
    messageRoutes(req, res, wss);
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

const wss = new WebSocket.Server({ noServer: true });
const messageService = MessageService.getInstance(wss);

wss.on("connection", (ws: WebSocket) => {
  console.log(` server.ts: new connection init`);
  ws.on("message", (messageData: JoinMessage | RegularMessage) => {
    console.log(`server.ts: ws.on("message") messageData: ${messageData}`);
    messageService.handleSocketMessage(ws, messageData);
  });
});

server.on("upgrade", upgradeMiddleware(wss));

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
