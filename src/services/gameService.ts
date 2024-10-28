import { GameState } from "../models/gameState";
import { Ship } from "../models/ship";
import RoomService from "./roomService";
import { createEmptyGrid, printGrid } from "../utils/gridUtils";
import { sendKillFeedback, sendMissFeedback } from "./feedbackService";
import { checkIfShipKilled, markKilledShip, markSurroundingKilledShipCellsAsMiss } from "../utils/shipUtils";
import UserConnections from "../services/userConnectionsService";

class GameService {
    public addShipsToGame(gameId: number, indexPlayer: number, ships: Ship[]): void {
        const game = RoomService.getGameState(gameId);
        if (!game || !game.players.has(indexPlayer)) {
            console.log(`Game ${gameId} or player ${indexPlayer} not found.`);
            return;
        }

        if (!game.grid.has(indexPlayer)) {
            game.grid.set(indexPlayer, createEmptyGrid());
        }
        const grid = game.grid.get(indexPlayer)!;

        ships.forEach(ship => {
            const { x, y } = ship.position;
            for (let i = 0; i < ship.length; i++) {
                if (ship.direction) {
                    grid[y + i][x] = "S";
                } else {
                    grid[y][x + i] = "S";
                }
            }
        });

        game.players.get(indexPlayer)!.ships = ships;
        console.log(`Game ${gameId} - Player ${indexPlayer}'s grid:`);
        printGrid(grid);
    }

    public isBothPlayersReady(game: GameState): boolean {
        return Array.from(game.players.values()).every(player => player.ships.length > 0);
    }

    public processAttack(gameId: number, playerId: number, x: number, y: number): { status: string, currentPlayer: number, position: { x: number, y: number } } | null {
        const game = RoomService.getGameState(gameId);
        if (!game) {
            console.log(`Game with ID ${gameId} not found`);
            return null;
        }

        const opponentId = this.getOpponentId(game, playerId);
        const opponent = game.players.get(opponentId)!;
        const opponentGrid = game.grid.get(opponentId)!;

        opponent.shots.add(`${x},${y}`);
        const hit = this.isHit(opponentGrid, x, y);

        let status: string;
        if (hit) {
            opponentGrid[y][x] = "X";
            const ship = checkIfShipKilled(opponentGrid, x, y, opponent.ships);
            if (ship) {
                status = "killed";
                markKilledShip(opponentGrid, ship);
                markSurroundingKilledShipCellsAsMiss(opponentGrid, ship);

                sendKillFeedback(gameId, ship, playerId);
                sendMissFeedback(gameId, ship, playerId);

                if (this.isGameOver(opponentGrid)) {
                    this.endGame(gameId, playerId);
                    return null;
                }
            } else {
                status = "shot";
            }
        } else {
            opponentGrid[y][x] = "~";
            status = "miss";
            this.changeTurnToOpponent(game, opponentId);
        }

        console.log(`Updated grid for Player ${opponentId} after attack by Player ${playerId} at (${x}, ${y}):`);
        printGrid(opponentGrid);

        return { status, currentPlayer: playerId, position: { x, y } };
    }
    private changeTurnToOpponent(game: GameState, opponentId: number): void {
        console.log(`changeTurnToOpponent from current ${game.currentPlayer} to opponent ${opponentId}`);
        game.currentPlayer = opponentId;
    }

    public getOpponentId(game: GameState, playerId: number): number {
        return game.turnOrder.find(id => id !== playerId)!;
    }

    private isHit(grid: string[][], x: number, y: number): boolean {
        const hit = grid[y][x] === "S";
        console.log(`Checking hit at (${x}, ${y}) in grid: ${hit ? "Hit" : "Miss"}`);
        return hit;
    }

    public getPlayerId(idGame: number, userIndex: number): number | undefined {
        const game = RoomService.getGameState(idGame);
        if (!game) return undefined;

        return game.players.has(userIndex) ? userIndex : undefined;
    }

    public getCurrentPlayer(gameId: number): number {
        const game = RoomService.getGameState(gameId);
        if (!game) {
            console.log(`Game with ID ${gameId} not found.`);
            return -1;
        }
        return game.currentPlayer;
    }

    private isGameOver(opponentGrid: string[][]): boolean {
        for (const row of opponentGrid) {
            if (row.includes("S")) {
                return false;
            }
        }
        return true;
    }

    private endGame(gameId: number, winnerId: number): void {
        const game = RoomService.getGameState(gameId);
        if (!game) return;

        const message = {
            type: "finish",
            data: JSON.stringify({
                winPlayer: winnerId,
            }),
            id: 0,
        };

        game.turnOrder.forEach(playerId => {
            const playerWs = UserConnections.getWs(playerId);
            if (playerWs) {
                playerWs.send(JSON.stringify(message));
            }
        });
    }
}

export default new GameService();
