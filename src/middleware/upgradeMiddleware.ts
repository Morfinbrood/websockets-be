import { IncomingMessage } from "http";
import { Duplex } from "stream";
import WebSocket from "ws";

export const upgradeMiddleware = (wss: WebSocket.Server) => (req: IncomingMessage, socket: Duplex, head: Buffer) => {
  if (req.url === "/handleUpgrade" && req.method === "GET") {
    wss.handleUpgrade(req, socket, head, (connection) => {
      console.log("Connection upgraded");
      wss.emit("connection", connection, req);
    });
  } else {
    socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
    socket.destroy();
  }
};
