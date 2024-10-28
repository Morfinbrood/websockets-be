// GameService.ts
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

        // Создаем или получаем сетку игрока
        if (!game.grid.has(playerId)) {
            game.grid.set(playerId, this.createEmptyGrid());
        }
        const grid = game.grid.get(playerId)!;

        // Устанавливаем корабли на сетке
        ships.forEach(ship => {
            const { x, y } = ship.position;
            for (let i = 0; i < ship.length; i++) {
                if (ship.direction) {
                    grid[y + i][x] = "S"; // Корабль (вертикально)
                } else {
                    grid[y][x + i] = "S"; // Корабль (горизонтально)
                }
            }
        });

        // Сохраняем размещенные корабли для игрока
        game.players.get(playerId)!.ships = ships;

        console.log(`Game ${gameId} - Player ${playerId}'s grid:`);
        this.printGrid(grid);

        return this.checkBothPlayersReady(game);
    }

    private printGrid(grid: string[][]): void {
        let gridOutput = "  0 1 2 3 4 5 6 7 8 9\n"; // Заголовок с нумерацией колонок
        grid.forEach((row, rowIndex) => {
            const rowString = row.map(cell => (cell === "S" || cell === "X" || cell === "~") ? cell : "O").join(" ");
            gridOutput += `${rowIndex} ${rowString}\n`; // Добавляем строку в общий вывод с новой строкой
        });
        console.log(gridOutput); // Выводим всю сетку одним `console.log`
    }

    private checkBothPlayersReady(game: GameState): boolean {
        return Array.from(game.players.values()).every(player => player.ships.length > 0);
    }

    public processAttack(gameId: number, playerId: number, x: number, y: number): { status: string, nextPlayer: number, position: { x: number, y: number } } | null {
        const game = RoomService.getGameState(gameId);
        if (!game) {
            console.log(`processAttack: Game with ID ${gameId} not found`);
            return null;
        }

        console.log(`processAttack: Player ${playerId} attacks at (${x}, ${y}) in game ${gameId}`);

        const opponentId = game.turnOrder.find(id => id !== playerId)!;
        const opponent = game.players.get(opponentId)!;
        const opponentGrid = game.grid.get(opponentId)!;

        // Проверка на повторный выстрел
        if (opponent.shots.has(`${x},${y}`)) {
            console.log(`processAttack: Miss already registered at (${x}, ${y}) for game ${gameId}`);
            return { status: "miss", nextPlayer: game.currentPlayer, position: { x, y } };
        }

        opponent.shots.add(`${x},${y}`);

        if (this.isHit(opponentGrid, x, y)) {
            opponentGrid[y][x] = "X"; // Обозначаем попадание на сетке
            const hitShip = opponent.ships.find(ship => this.isHit(opponentGrid, x, y)); // Ищем корабль для обновления статуса
            if (hitShip) hitShip.hits += 1;

            const status = hitShip && hitShip.hits === hitShip.length ? "killed" : "shot";
            console.log(`processAttack: Player ${playerId} hits ${status} at (${x}, ${y})`);

            if (status === "killed" && opponent.ships.every(ship => ship.hits === ship.length)) {
                console.log(`processAttack: All ships destroyed for opponent. Ending game ${gameId}`);
                RoomService.endGame(gameId);
            }

            console.log(`Updated grid after hit by Player ${playerId}:`);
            this.printGrid(opponentGrid);

            return { status, nextPlayer: playerId, position: { x, y } };
        } else {
            opponentGrid[y][x] = "~"; // Обозначаем промах на сетке
            game.currentPlayer = opponentId;
            console.log(`processAttack: Miss by Player ${playerId}. Next turn: Player ${opponentId}`);
            console.log(`Updated grid after miss by Player ${playerId}:`);
            this.printGrid(opponentGrid);
            return { status: "miss", nextPlayer: opponentId, position: { x, y } };
        }
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
