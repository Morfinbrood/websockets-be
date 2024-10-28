import { Ship } from "./ship";

export interface PlayerState {
    ships: Ship[];                   // Корабли игрока
    shots: Set<string>;              // Набор координат выстрелов
}

export interface GameState {
    idGame: number;                   // Идентификатор игры
    players: Map<number, PlayerState>; // Карта состояний игроков, где ключ — идентификатор игрока
    currentPlayer: number;            // Идентификатор текущего игрока, который делает ход
    turnOrder: number[];              // Очередность ходов (массив идентификаторов игроков)
}
