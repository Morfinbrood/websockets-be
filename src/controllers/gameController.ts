import { Ship } from "../models/ship";
import GameService from "../services/gameService";
import RoomService from "../services/roomService";
import UserConnections from "../services/userConnectionsService";

class GameController {
    public handleAddShips(gameId: number, indexPlayer: number, ships: Ship[]) {
        let isBothReady;
        GameService.addShipsToGame(gameId, indexPlayer, ships);
        const game = RoomService.getGameState(gameId);

        if (game) { isBothReady = GameService.isBothPlayersReady(game) }

        if (isBothReady) {
            const gameState = RoomService.getGameState(gameId);

            gameState?.players.forEach((player, playerId) => {
                const playerWs = UserConnections.getWs(playerId);
                if (playerWs) {
                    let playerShips = player.ships;

                    playerWs.send(JSON.stringify({
                        type: "start_game",
                        data: JSON.stringify({ ships: playerShips, currentPlayerIndex: playerId }),
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

            const currentTurnPlayer = GameService.getCurrentPlayer(gameId)
            this.sendTurnUpdate(gameId, currentTurnPlayer);
        }
    }

    private sendTurnUpdate(gameId: number, currentPlayer: number) {
        const gameState = RoomService.getGameState(gameId);
        if (gameState) {
            gameState.turnOrder.forEach(id => {
                const playerWs = UserConnections.getWs(id);
                if (playerWs) {
                    console.log(`sendTurnUpdate     ${currentPlayer}`)
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
