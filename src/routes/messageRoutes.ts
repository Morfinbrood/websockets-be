import { IncomingMessage, ServerResponse } from "http";
import { Server } from "ws";
import { MessageService } from "../services/messageService";

export default function messageRoutes(req: IncomingMessage, res: ServerResponse, wss: Server) {
    const messageService = MessageService.getInstance(wss);

    if (req.method === "POST" && req.url === "/sendHTTPMessage") {
        let body = "";

        // Чтение тела запроса
        req.on("data", (chunk) => {
            body += chunk;
        });

        req.on("end", () => {
            try {
                const parsedBody = JSON.parse(body);
                console.log(`POST /sendHTTPMessage req.body: ${parsedBody}`);

                // Передача сообщения в messageService для обработки
                messageService.handleHTTPMessage(parsedBody, res);
            } catch (error) {
                console.error("Ошибка при разборе тела запроса:", error);
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Неверный формат JSON" }));
            }
        });
    } else {
        // Если URL не совпадает, возвращаем 404
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
    }
}
