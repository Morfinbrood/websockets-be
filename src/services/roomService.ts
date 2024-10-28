import memoryDb from "../db/memoryDB";
import { User } from "../models/user";

class RoomService {
    private activeGames: Map<number, { idGame: number, players: Map<number, number> }> = new Map();
    private gameCounter = 1;
    private playerCounter = 1;

    public createRoom(user: User): number | null {
        if (memoryDb.isUserInRoom(user)) {
            console.log(`User ${user.name} is already in a room.`);
            return null;
        }
        return memoryDb.createRoom(user);
    }

    public addUserToRoom(user: User, roomId: number): { idGame: number, idPlayer: number } | null {
        const room = memoryDb.getRooms()[roomId];
        if (!room) {
            console.log(`Room ${roomId} does not exist.`);
            return null;
        }

        if (room.some(u => u.index === user.index)) {
            console.log(`User ${user.name} is already in room ${roomId}.`);
            return null;
        }

        room.push(user);

        if (room.length === 2) {
            const idGame = this.gameCounter++;
            const players = new Map<number, number>();

            room.forEach(player => {
                const idPlayer = this.playerCounter++;
                players.set(player.index, idPlayer);
            });

            this.activeGames.set(idGame, { idGame, players });
            return { idGame, idPlayer: players.get(user.index)! };
        }

        return null;
    }

    public getPlayerId(idGame: number, userIndex: number): number | undefined {
        const game = this.activeGames.get(idGame);
        return game?.players.get(userIndex);
    }

    public getRoomsData() {
        return Object.entries(memoryDb.getRooms()).map(([roomId, users]) => ({
            roomId,
            roomUsers: users.map(user => ({
                name: user.name,
                index: user.index,
            })),
        }));
    }
}

export default new RoomService();
