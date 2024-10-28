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
                    const playerShips = gameState.players.get(id)!.ships;
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
        if (!gameState) {
            console.log(`handleAttack: Game with ID ${gameId} not found`);
            return;
        }
        if (gameState.currentPlayer !== indexPlayer) {
            console.log(`handleAttack: It's not Player ${indexPlayer}'s turn`);
            return;
        }

        console.log(`handleAttack: Player ${indexPlayer} attacks at (${x}, ${y}) in game ${gameId}`);
        const result = GameService.processAttack(gameId, indexPlayer, x, y);

        if (result) {
            console.log(`handleAttack: Attack result - ${JSON.stringify(result)}`);

            // Рассылка результата атаки обоим игрокам
            gameState.turnOrder.forEach(id => {
                const playerWs = UserConnections.getWs(id);
                if (playerWs) {
                    playerWs.send(JSON.stringify({
                        type: "attack",
                        data: JSON.stringify(result),
                        id: 0,
                    }));
                    console.log(`handleAttack: Sent attack result to Player ${id}`);
                }
            });

            // Если результат - промах, отправляем событие смены хода
            if (result.status === "miss") {
                console.log(`handleAttack: Miss detected. Switching turn to Player ${result.nextPlayer}`);
                this.sendTurnUpdate(gameId, result.nextPlayer);
            }
        }
    }

    private sendTurnUpdate(gameId: number, currentPlayer: number) {
        const gameState = RoomService.getGameState(gameId);
        if (gameState) {
            console.log(`sendTurnUpdate: Current turn is for Player ${currentPlayer} in game ${gameId}`);
            gameState.turnOrder.forEach(id => {
                const playerWs = UserConnections.getWs(id);
                if (playerWs) {
                    playerWs.send(JSON.stringify({
                        type: "turn",
                        data: JSON.stringify({ currentPlayer }),
                        id: 0,
                    }));
                    console.log(`sendTurnUpdate: Notified Player ${id} of turn for Player ${currentPlayer}`);
                }
            });
        }
    }
}

export default new GameController();
