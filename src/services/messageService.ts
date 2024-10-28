import memoryDb from "../db/memoryDB";
import WebSocket from "ws";
import RoomService from "./roomService";
import UserService from "./userService";
import { Message } from "../models/message";

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
        let parsedData;
        if (data) { parsedData = JSON.parse(data); }

        switch (type) {
            case "reg":
                this.handleRegistration(parsedData, ws);
                break;
            case "create_room":
                this.handleCreateRoom(ws);
                break;
            case "add_user_to_room":
                this.handleAddUserToRoom(parsedData.indexRoom, ws);
                break;
            case "add_ships":
                this.handleAddShips(parsedData);
                break;
            case "attack":
                this.handleAttack(parsedData, ws);
                break;
            case "randomAttack":
                this.handleRandomAttack(parsedData, ws);
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
            this.wsConnections.set(user.index, ws);
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

    private handleAddShips(data: any) {
        const { gameId, ships, indexPlayer } = data;
        const player = UserService.getUserByIndex(indexPlayer);
        if (!player) return;

        const isReady = RoomService.addShipsToGame(gameId, indexPlayer, ships);

        if (isReady) {
            const gameState = RoomService.getGameState(gameId);
            if (gameState) {
                gameState.turnOrder.forEach(id => {
                    const playerWs = this.wsConnections.get(id);
                    if (playerWs) {
                        const playerShips = gameState.players.get(id)!.ships;
                        playerWs.send(JSON.stringify({
                            type: "start_game",
                            data: JSON.stringify({ ships: playerShips, currentPlayerIndex: gameState.currentPlayer }),
                            id: 0
                        }));
                    }
                });
                this.sendTurnUpdate(gameId, gameState.currentPlayer);
            }
        }
    }


    private handleAttack(data: any, ws: WebSocket) {
        const { gameId, x, y, indexPlayer } = data;
        const gameState = RoomService.getGameState(gameId);

        if (!gameState || gameState.currentPlayer !== indexPlayer) {
            console.log(`Player ${indexPlayer} attempted to attack out of turn in game ${gameId}`);
            return;
        }

        const result = RoomService.processAttack(gameId, indexPlayer, x, y);

        if (result) {
            gameState.turnOrder.forEach(id => {
                const playerWs = this.wsConnections.get(id);
                if (playerWs) {
                    playerWs.send(JSON.stringify({
                        type: "attack",
                        data: JSON.stringify(result),
                        id: 0,
                    }));
                }
            });

            if (result.status === "miss") {
                this.sendTurnUpdate(gameId, result.currentPlayer);
            }
        }
    }


    private handleRandomAttack(data: any, ws: WebSocket) {
        const { gameId, indexPlayer } = data;
        const gameState = RoomService.getGameState(gameId);
        if (!gameState) return;

        const randomX = Math.floor(Math.random() * 10);
        const randomY = Math.floor(Math.random() * 10);

        this.handleAttack({ gameId, x: randomX, y: randomY, indexPlayer }, ws);
    }

    private sendTurnUpdate(gameId: number, currentPlayer: number) {
        const gameState = RoomService.getGameState(gameId);
        if (gameState) {
            gameState.turnOrder.forEach(id => {
                const playerWs = this.wsConnections.get(id);
                if (playerWs) {
                    playerWs.send(JSON.stringify({
                        type: "turn",
                        data: JSON.stringify({ currentPlayer }),
                        id: 0,
                    }));
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
