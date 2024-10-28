import memoryDb from "../db/memoryDB";
import { User } from "../models/user";
import { GameState } from "../models/gameState";
import { Ship } from "../models/ship";

class RoomService {
    private activeGames: Map<number, GameState> = new Map();
    private gameCounter = 1;

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
            const players = new Map<number, { ships: Ship[], shots: Set<string> }>();
            room.forEach(player => {
                players.set(player.index, { ships: [], shots: new Set() });
            });

            this.activeGames.set(idGame, { idGame, players, currentPlayer: room[0].index, turnOrder: [room[0].index, room[1].index] });
            return { idGame, idPlayer: user.index };
        }

        return null;
    }

    public getGameState(gameId: number): GameState | undefined {
        return this.activeGames.get(gameId);
    }

    public endGame(gameId: number): void {
        this.activeGames.delete(gameId);
        console.log(`Game ${gameId} has ended.`);
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
