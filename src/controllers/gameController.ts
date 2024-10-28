import GameService from "../services/gameService";
import RoomService from "../services/roomService";
import UserConnections from "../services/userConnectionsService";

class GameController {
    public handleAddShips(gameId: number, indexPlayer: number, ships: any) {
        const isReady = GameService.addShipsToGame(gameId, indexPlayer, ships);

        if (isReady) {
            const gameState = RoomService.getGameState(gameId);
            gameState?.turnOrder.forEach(id => {
                const playerWs = UserConnections.getWs(id);
                if (playerWs) {
                    const playerShips = gameState.grid.get(id)!;
                    playerWs.send(JSON.stringify({
                        type: "start_game",
                        data: JSON.stringify({ ships: playerShips, currentPlayerIndex: gameState.currentPlayer }),
                        id: 0
                    }));
                }
            });
            this.sendTurnUpdate(gameId, gameState!.currentPlayer);
        }
    }

    public handleRandomAttack(gameId: number, indexPlayer: number) {
        const randomX = Math.floor(Math.random() * 10);
        const randomY = Math.floor(Math.random() * 10);

        this.handleAttack(gameId, randomX, randomY, indexPlayer);
    }

    public handleAttack(gameId: number, x: number, y: number, indexPlayer: number) {
        const gameState = RoomService.getGameState(gameId);
        if (!gameState || gameState.currentPlayer !== indexPlayer) return;

        const result = GameService.processAttack(gameId, indexPlayer, x, y);

        if (result) {
            gameState.turnOrder.forEach(id => {
                const playerWs = UserConnections.getWs(id);
                if (playerWs) {
                    playerWs.send(JSON.stringify({
                        type: "attack",
                        data: JSON.stringify(result),
                        id: 0,
                    }));
                }
            });

            // Используем result.currentPlayer, чтобы передать ID следующего игрока после промаха
            if (result.status === "miss") {
                this.sendTurnUpdate(gameId, result.currentPlayer);
            }
        }
    }

    private sendTurnUpdate(gameId: number, currentPlayer: number) {
        const gameState = RoomService.getGameState(gameId);
        if (gameState) {
            gameState.turnOrder.forEach(id => {
                const playerWs = UserConnections.getWs(id);
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
}

export default new GameController();
