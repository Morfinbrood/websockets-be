import { GameState } from "../models/gameState";
import { Ship } from "../models/ship";
import RoomService from "./roomService";

class GameService {

    public addShipsToGame(gameId: number, playerId: number, ships: Ship[]): boolean {
        const game = RoomService.getGameState(gameId);
        if (!game || !game.players.has(playerId)) {
            console.log(`Game ${gameId} or player ${playerId} not found.`);
            return false;
        }

        // Добавляем корабли для указанного игрока
        game.players.get(playerId)!.ships = ships;

        // Проверяем, готовы ли оба игрока к началу игры
        return this.checkBothPlayersReady(game);
    }

    private checkBothPlayersReady(game: GameState): boolean {
        return Array.from(game.players.values()).every(player => player.ships.length > 0);
    }

    public processAttack(gameId: number, playerId: number, x: number, y: number): { status: string, currentPlayer: number, position: { x: number, y: number } } | null {
        const game = RoomService.getGameState(gameId);
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
                RoomService.endGame(gameId); // Завершает игру при уничтожении всех кораблей
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

    public createEmptyGrid(): string[][] {
        return Array(10).fill(null).map(() => Array(10).fill("empty"));
    }

    public getPlayerId(idGame: number, userIndex: number): number | undefined {
        const game = RoomService.getGameState(idGame);
        if (!game) return undefined;

        // Проверяем, что игрок с данным индексом участвует в игре
        return game.players.has(userIndex) ? userIndex : undefined;
    }
}

export default new GameService();
