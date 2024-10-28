import { GameState } from "../models/gameState";
import { Ship } from "../models/ship";
import RoomService from "./roomService";

class GameService {
    public addShipsToGame(gameId: number, indexPlayer: number, ships: Ship[]): void {
        const game = RoomService.getGameState(gameId);

        if (!game || !game.players.has(indexPlayer)) {
            console.log(`Game ${gameId} or player ${indexPlayer} not found.`);
            return;
        }

        if (!game.grid.has(indexPlayer)) {
            game.grid.set(indexPlayer, this.createEmptyGrid());
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
        console.log(`Game ${gameId} - Player ${indexPlayer}\'s grid:`);
        this.printGrid(grid);
    }

    private printGrid(grid: string[][]): void {
        let gridOutput = "  0 1 2 3 4 5 6 7 8 9\n";
        grid.forEach((row, rowIndex) => {
            const rowString = row.map(cell => (cell === "S" || cell === "X" || cell === "~" || cell === "#") ? cell : "O").join(" ");
            gridOutput += `${rowIndex} ${rowString}\n`;
        });
        console.log(gridOutput);
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
            const ship = this.checkIfShipKilled(opponentGrid, x, y, opponent.ships);
            if (ship) {
                status = "killed";
                this.markKilledShip(opponentGrid, ship);
                this.markSurroundingKilledShipCellsAsMiss(opponentGrid, ship);
            } else {
                status = "shot";
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

    private checkIfShipKilled(grid: string[][], x: number, y: number, ships: Ship[]): Ship | null {
        for (const ship of ships) {
            const { position } = ship;
            const isSunk = ship.direction
                ? Array.from({ length: ship.length }).every((_, i) => grid[position.y + i][position.x] === "X")
                : Array.from({ length: ship.length }).every((_, i) => grid[position.y][position.x + i] === "X");

            if (isSunk) {
                return ship;
            }
        }
        return null;
    }

    private markKilledShip(grid: string[][], ship: Ship): void {
        const { position } = ship;
        for (let i = 0; i < ship.length; i++) {
            if (ship.direction) { // Вертикальная ориентация
                grid[position.y + i][position.x] = "#"; // Пометка убитого корабля
            } else { // Горизонтальная ориентация
                grid[position.y][position.x + i] = "#"; // Пометка убитого корабля
            }
        }
    }

    private markSurroundingKilledShipCellsAsMiss(grid: string[][], ship: Ship): void {
        // Направления для проверки всех клеток вокруг каждого сегмента корабля
        const directions = [
            { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
            { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
            { dx: -1, dy: 1 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 },
        ];

        // Проходим по каждому сегменту корабля
        for (let i = 0; i < ship.length; i++) {
            const segmentX = ship.direction ? ship.position.x : ship.position.x + i;
            const segmentY = ship.direction ? ship.position.y + i : ship.position.y;

            // Проверяем и помечаем клетки вокруг текущего сегмента
            for (const { dx, dy } of directions) {
                const newX = segmentX + dx;
                const newY = segmentY + dy;
                if (this.isWithinBounds(newX, newY, grid.length, grid[0].length)) {
                    // Помечаем как "miss" только пустые клетки
                    if (grid[newY][newX] === "O") {
                        grid[newY][newX] = "~";
                    }
                }
            }
        }
    }

    private isWithinBounds(x: number, y: number, maxRows: number, maxCols: number): boolean {
        return x >= 0 && x < maxCols && y >= 0 && y < maxRows;
    }

    private changeTurnToOpponent(game: GameState, opponentId: number): void {
        console.log(`changeTurnToOpponent from current ${game.currentPlayer} to opponent ${opponentId}`);
        game.currentPlayer = opponentId;
    }

    public getCurrentPlayer(gameId: number): number {
        const game = RoomService.getGameState(gameId);
        if (!game) {
            console.log(`Game with ID ${gameId} not found.`);
            return -1;
        }
        return game.currentPlayer;
    }

    private getOpponentId(game: GameState, playerId: number): number {
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

    public createEmptyGrid(): string[][] {
        return Array(10).fill(null).map(() => Array(10).fill("O"));
    }
}

export default new GameService();
