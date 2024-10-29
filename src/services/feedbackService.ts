import UserConnections from "../services/userConnectionsService";
import { Ship } from "../models/ship";
import RoomService from "./roomService";
import { isWithinBounds } from "../utils/gridUtils";
import gameService from "./gameService";

export function sendKillFeedback(gameId: number, ship: Ship, currentPlayer: number) {
    const game = RoomService.getGameState(gameId);
    if (!game) return;

    const message = (x: number, y: number) => ({
        type: "attack",
        data: JSON.stringify({
            position: { x, y },
            currentPlayer,
            status: "killed"
        }),
        id: 0
    });

    for (let i = 0; i < ship.length; i++) {
        const x = ship.direction ? ship.position.x : ship.position.x + i;
        const y = ship.direction ? ship.position.y + i : ship.position.y;

        game.turnOrder.forEach((playerId: number) => {
            const playerWs = UserConnections.getWs(playerId);
            if (playerWs) {
                playerWs.send(JSON.stringify(message(x, y)));
            }
        });
    }
}


export function sendMissFeedback(gameId: number, ship: Ship, currentPlayer: number) {
    const game = RoomService.getGameState(gameId);
    if (!game) return;
    const opponentGrid = game.grid.get(gameService.getOpponentId(game, currentPlayer))!;

    const directions = [
        { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
        { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
        { dx: -1, dy: 1 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 },
    ];

    const message = (x: number, y: number) => ({
        type: "attack",
        data: JSON.stringify({
            position: { x, y },
            currentPlayer,
            status: "miss"
        }),
        id: 0
    });

    for (let i = 0; i < ship.length; i++) {
        const segmentX = ship.direction ? ship.position.x : ship.position.x + i;
        const segmentY = ship.direction ? ship.position.y + i : ship.position.y;

        for (const { dx, dy } of directions) {
            const newX = segmentX + dx;
            const newY = segmentY + dy;
            if (isWithinBounds(newX, newY, opponentGrid.length, opponentGrid[0].length) &&
                opponentGrid[newY][newX] === "~") {

                game.turnOrder.forEach(playerId => {
                    const playerWs = UserConnections.getWs(playerId);
                    if (playerWs) {
                        playerWs.send(JSON.stringify(message(newX, newY)));
                    }
                });
            }
        }
    }
}
