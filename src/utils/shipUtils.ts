import { Ship } from "../models/ship";
import { isWithinBounds } from "./gridUtils";

export function checkIfShipKilled(grid: string[][], x: number, y: number, ships: Ship[]): Ship | null {
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

export function markKilledShip(grid: string[][], ship: Ship): void {
    const { position } = ship;
    for (let i = 0; i < ship.length; i++) {
        if (ship.direction) {
            grid[position.y + i][position.x] = "#";
        } else {
            grid[position.y][position.x + i] = "#";
        }
    }
}

export function markSurroundingKilledShipCellsAsMiss(grid: string[][], ship: Ship): void {
    const directions = [
        { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
        { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
        { dx: -1, dy: 1 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 },
    ];

    for (let i = 0; i < ship.length; i++) {
        const segmentX = ship.direction ? ship.position.x : ship.position.x + i;
        const segmentY = ship.direction ? ship.position.y + i : ship.position.y;

        for (const { dx, dy } of directions) {
            const newX = segmentX + dx;
            const newY = segmentY + dy;
            if (isWithinBounds(newX, newY, grid.length, grid[0].length)) {
                if (grid[newY][newX] === "O") {
                    grid[newY][newX] = "~";
                }
            }
        }
    }
}
