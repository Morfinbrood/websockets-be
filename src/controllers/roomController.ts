import RoomService from "../services/roomService";
import UserConnections from "../services/userConnectionsService";
import UserService from "../services/userService";
import memoryDb from "../db/memoryDB";
import WebSocket from "ws";
import GameService from "../services/gameService";

class RoomController {
    public handleCreateRoom(ws: WebSocket) {
        const userIndex = UserConnections.getUserIndex(ws);
        if (userIndex === undefined) return;

        const user = UserService.getUserByIndex(userIndex);
        if (!user) return;

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
                data: JSON.stringify({ indexRoom: roomIndex }),
                id: 0,
            };
        }
        ws.send(JSON.stringify(response));
        this.broadcastRoomsUpdate();
    }

    public handleAddUserToRoom(roomId: number, ws: WebSocket) {
        const userIndex = UserConnections.getUserIndex(ws);
        if (userIndex === undefined) return;

        const user = UserService.getUserByIndex(userIndex);
        if (!user) return;

        const gameInfo = RoomService.addUserToRoom(user, roomId);
        if (gameInfo) {
            const { idGame, idPlayer } = gameInfo;
            const room = memoryDb.getRooms()[roomId];
            room.forEach(player => {
                const playerWs = UserConnections.getWs(player.index);
                if (playerWs) {
                    playerWs.send(JSON.stringify({
                        type: "create_game",
                        data: JSON.stringify({ idGame, idPlayer: GameService.getPlayerId(idGame, player.index) }),
                        id: 0,
                    }));
                }
            });
        }
    }

    public broadcastRoomsUpdate() {
        const roomsData = RoomService.getRoomsData();
        const updateMessage = {
            type: "update_room",
            data: JSON.stringify(roomsData),
            id: 0,
        };

        UserConnections.getAllConnections().forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(updateMessage));
            }
        });
    }

}

export default new RoomController();
