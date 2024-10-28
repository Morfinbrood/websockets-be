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

        if (!game.grid.has(playerId)) {
            game.grid.set(playerId, this.createEmptyGrid());
        }
        const grid = game.grid.get(playerId)!;

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

        game.players.get(playerId)!.ships = ships;
        console.log(`Game ${gameId} - Player ${playerId}'s grid:`);
        this.printGrid(grid);

        return this.checkBothPlayersReady(game);
    }

    private printGrid(grid: string[][]): void {
        let gridOutput = "  0 1 2 3 4 5 6 7 8 9\n";
        grid.forEach((row, rowIndex) => {
            const rowString = row.map(cell => (cell === "S" || cell === "X" || cell === "~") ? cell : "O").join(" ");
            gridOutput += `${rowIndex} ${rowString}\n`;
        });
        console.log(gridOutput);
    }

    private checkBothPlayersReady(game: GameState): boolean {
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

        // if (opponent.shots.has(`${x},${y}`)) {
        //     console.log(`Repeated shot at (${x}, ${y}) - ignored`);
        //     return null;
        // }

        opponent.shots.add(`${x},${y}`);
        const hit = this.isHit(opponentGrid, x, y);

        let status: string;
        if (hit) {
            opponentGrid[y][x] = "X";
            status = "shot";
            if (status === "killed" && this.isGameOver(opponent)) {
                RoomService.endGame(game.idGame);
            }
        } else {
            opponentGrid[y][x] = "~";
            status = "miss";
            this.changeTurnToOpponent(game, opponentId);
        }

        console.log(`Updated grid for Player ${opponentId} after attack by Player ${playerId} at (${x}, ${y}):`);
        this.printGrid(opponentGrid);

        return { status, currentPlayer: playerId, position: { x, y } };
    }
    private changeTurnToOpponent(game: GameState, opponentId: number): void {
        console.log(`changeTurnToOpponent from current ${game.currentPlayer} to opponent ${opponentId}`)
        game.currentPlayer = opponentId;
    }

    public getCurrentPlayer(gameId: number): number {
        const game = RoomService.getGameState(gameId);
        if (!game) {
            console.log(`Game with ID ${gameId} not found`);
            return -1;
        }
        return game.currentPlayer;
    }

    private getOpponentId(game: GameState, playerId: number): number {
        return game.turnOrder.find(id => id !== playerId)!;
    }

    private hasAlreadyShot(opponent: any, x: number, y: number): boolean {
        return opponent.shots.has(`${x},${y}`);
    }

    private isGameOver(opponent: any): boolean {
        return opponent.ships.every((ship: { hits: any; length: any; }) => ship.hits === ship.length);
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

    public createEmptyGrid(): string[][] {
        return Array(10).fill(null).map(() => Array(10).fill("O"));
    }
}

export default new GameService();
