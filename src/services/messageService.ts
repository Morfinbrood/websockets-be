import WebSocket from "ws";
import { Message } from "../models/message";
import UserService from "./userService";
import RoomService from "./roomService";
import memoryDb from "../db/memoryDB";

export class MessageService {
    private static instance: MessageService;
    private userConnections: Map<WebSocket, number> = new Map();
    private wsConnections: Map<number, WebSocket> = new Map();

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

        switch (type) {
            case "reg":
                const parsedData = JSON.parse(data);
                this.handleRegistration(parsedData, ws);
                break;
            case "create_room":
                this.handleCreateRoom(ws);
                break;
            case "add_user_to_room":
                const roomData = JSON.parse(data);
                this.handleAddUserToRoom(roomData.indexRoom, ws);
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
            this.userConnections.set(ws, user.index);
            this.wsConnections.set(user.index, ws); // associate userIndex and WebSocket
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

    private handleCreateRoom(ws: WebSocket) {
        const userIndex = this.userConnections.get(ws);
        if (userIndex === undefined) {
            console.log("User not found for room creation");
            return;
        }

        const user = UserService.getUserByIndex(userIndex);
        if (!user) {
            console.log("User data not found in UserService");
            return;
        }

        const roomIndex = RoomService.createRoom(user);
        let response;
        if (roomIndex === null) {
            response = {
                type: "error",
                data: JSON.stringify({
                    errorText: "User is already in a room and cannot create another.",
                }),
                id: 0,
            };
        } else {
            response = {
                type: "add_user_to_room",
                data: JSON.stringify({
                    indexRoom: roomIndex,
                }),
                id: 0,
            };
        }
        ws.send(JSON.stringify(response));
        this.broadcastRoomsUpdate();
    }

    private handleAddUserToRoom(roomId: number, ws: WebSocket) {
        const userIndex = this.userConnections.get(ws);
        if (userIndex === undefined) {
            console.log("User not found for room addition");
            return;
        }

        const user = UserService.getUserByIndex(userIndex);
        if (!user) {
            console.log("User data not found in UserService");
            return;
        }

        const gameInfo = RoomService.addUserToRoom(user, roomId);

        if (gameInfo) {
            const { idGame, idPlayer } = gameInfo;

            const room = memoryDb.getRooms()[roomId];
            room.forEach(player => {
                const playerWs = this.wsConnections.get(player.index);
                if (playerWs && playerWs.readyState === WebSocket.OPEN) {
                    const response = {
                        type: "create_game",
                        data: JSON.stringify({
                            idGame,
                            idPlayer: RoomService.getPlayerId(idGame, player.index),
                        }),
                        id: 0,
                    };
                    playerWs.send(JSON.stringify(response));
                }
            });
        }
    }

    private broadcastRoomsUpdate() {
        const roomsData = RoomService.getRoomsData();
        const updateMessage = {
            type: "update_room",
            data: JSON.stringify(roomsData),
            id: 0,
        };

        this.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(updateMessage));
            }
        });
    }
}
