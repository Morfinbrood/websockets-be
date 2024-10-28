import WebSocket from "ws";
import UserConnections from "./userConnectionsService";
import GameController from "../controllers/gameController";
import RoomController from "../controllers/roomController";
import UserService from "./userService";
import { Message } from "../models/message";

export class MessageService {
    private static instance: MessageService;

    private constructor(private wss: WebSocket.Server) { }

    public static getInstance(wss: WebSocket.Server): MessageService {
        if (!MessageService.instance) {
            MessageService.instance = new MessageService(wss);
        }
        return MessageService.instance;
    }

    public handleSocketMessage(ws: WebSocket, messageData: Message) {
        const messageParsed = JSON.parse(messageData.toString());
        const { type, data } = messageParsed;
        let parsedData;
        if (data) parsedData = JSON.parse(data);

        switch (type) {
            case "reg":
                this.handleRegistration(parsedData, ws);
                break;
            case "create_room":
                RoomController.handleCreateRoom(ws);
                break;
            case "add_user_to_room":
                RoomController.handleAddUserToRoom(parsedData.indexRoom, ws);
                break;
            case "add_ships":
                GameController.handleAddShips(parsedData.gameId, parsedData.indexPlayer, parsedData.ships);
                break;
            case "attack":
                GameController.handleAttack(parsedData.gameId, parsedData.x, parsedData.y, parsedData.indexPlayer);
                break;
            case "randomAttack":
                GameController.handleRandomAttack(parsedData.gameId, parsedData.indexPlayer);
                break;
            default:
                console.log("Unknown message type");
                break;
        }
    }

    private handleRegistration(data: { name: string, password: string }, ws: WebSocket) {
        const { name, password } = data;
        const user = UserService.addUser(name, password);

        let response;
        if (user) {
            UserConnections.addConnection(ws, user.index);
            RoomController.broadcastRoomsUpdate();
            response = {
                type: "reg",
                data: JSON.stringify({
                    name: user.name,
                    index: user.index,
                    error: false,
                    errorText: "",
                }),
                id: 0,
            };
        } else {
            response = {
                type: "reg",
                data: JSON.stringify({
                    name,
                    error: true,
                    errorText: "User already registered.",
                }),
                id: 0,
            };
        }
        ws.send(JSON.stringify(response));
    }
}
