import WebSocket, { WebSocketServer } from 'ws';
import { MessageService } from "./services/messageService";

import { RegistrationMessage } from "./types/types";

const PORT = 3000;

export const wss = new WebSocketServer({
  port: PORT,
});

const messageService = MessageService.getInstance(wss);

wss.on("connection", (ws: WebSocket) => {
  console.log(` server.ts: new connection init`);
  ws.on("message", (messageData: RegistrationMessage) => {
    console.log(`server.ts: ws.on("message") messageData: ${messageData}`);
    messageService.handleSocketMessage(ws, messageData);
  });
});
