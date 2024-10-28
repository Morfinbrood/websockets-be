import { Ship } from "./ship";

export interface PlayerState {
    ships: Ship[];                   // Корабли игрока
    shots: Set<string>;              // Набор координат выстрелов
}

export interface GameState {
    idGame: number;
    players: Map<number, { ships: Ship[], shots: Set<string> }>;
    currentPlayer: number;
    turnOrder: number[];
    grid: Map<number, string[][]>; // Добавляем свойство grid для каждого игрока
}