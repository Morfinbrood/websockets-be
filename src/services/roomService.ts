import memoryDb from "../db/memoryDB";
import { User } from "../models/user";

interface Ship {
    position: { x: number, y: number };
    direction: boolean;
    length: number;
    type: "small" | "medium" | "large" | "huge";
    hits: number;
}

interface GameState {
    idGame: number;
    players: Map<number, { ships: Ship[], grid: string[][], shots: Set<string> }>;
    currentPlayer: number;
    turnOrder: number[];
}

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
            const turnOrder = [room[0].index, room[1].index];
            const players = new Map<number, { ships: Ship[], grid: string[][], shots: Set<string> }>();

            room.forEach(player => {
                players.set(player.index, { ships: [], grid: this.createEmptyGrid(), shots: new Set() });
            });

            this.activeGames.set(idGame, { idGame, players, currentPlayer: room[0].index, turnOrder });
            return { idGame, idPlayer: this.getPlayerId(idGame, user.index)! };
        }

        return null;
    }

    public addShipsToGame(gameId: number, playerId: number, ships: Ship[]): boolean {
        const game = this.activeGames.get(gameId);
        if (!game || !game.players.has(playerId)) {
            console.log(`Game ${gameId} or player ${playerId} not found.`);
            return false;
        }

        game.players.get(playerId)!.ships = ships;
        return this.checkBothPlayersReady(gameId);
    }

    private checkBothPlayersReady(gameId: number): boolean {
        const game = this.activeGames.get(gameId);
        if (!game) return false;

        return Array.from(game.players.values()).every(player => player.ships.length > 0);
    }


    public getGameState(gameId: number): GameState | undefined {
        return this.activeGames.get(gameId);
    }

    public getPlayerId(idGame: number, userIndex: number): number | undefined {
        const game = this.activeGames.get(idGame);
        if (!game) return undefined;

        if (game.players.has(userIndex)) {
            return userIndex;
        }
        return undefined;
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

    public processAttack(gameId: number, playerId: number, x: number, y: number): { status: string, currentPlayer: number, position: { x: number, y: number } } | null {
        const game = this.activeGames.get(gameId);
        if (!game) return null;

        const opponentId = game.turnOrder.find(id => id !== playerId)!;
        const opponent = game.players.get(opponentId)!;

        if (opponent.shots.has(`${x},${y}`)) return { status: "miss", currentPlayer: game.currentPlayer, position: { x, y } };

        opponent.shots.add(`${x},${y}`);
        const hitShip = opponent.ships.find(ship => this.isHit(ship, x, y));

        if (hitShip) {
            hitShip.hits += 1;
            const status = hitShip.hits === hitShip.length ? "killed" : "shot";
            if (status === "killed" && opponent.ships.every(ship => ship.hits === ship.length)) {
                this.activeGames.delete(gameId);
            }
            return { status, currentPlayer: playerId, position: { x, y } };
        } else {
            game.currentPlayer = opponentId;
            return { status: "miss", currentPlayer: playerId, position: { x, y } };
        }
    }

    private isHit(ship: Ship, x: number, y: number): boolean {
        if (ship.direction) {
            return y === ship.position.y && x >= ship.position.x && x < ship.position.x + ship.length;
        } else {
            return x === ship.position.x && y >= ship.position.y && y < ship.position.y + ship.length;
        }
    }

    private createEmptyGrid(): string[][] {
        return Array(10).fill(null).map(() => Array(10).fill("empty"));
    }
}

export default new RoomService();
