export function createEmptyGrid(): string[][] {
    return Array(10).fill(null).map(() => Array(10).fill("O"));
}

export function printGrid(grid: string[][]): void {
    let gridOutput = "  0 1 2 3 4 5 6 7 8 9\n";
    grid.forEach((row, rowIndex) => {
        const rowString = row.map(cell => (cell === "S" || cell === "X" || cell === "~" || cell === "#") ? cell : "O").join(" ");
        gridOutput += `${rowIndex} ${rowString}\n`;
    });
    console.log(gridOutput);
}

export function isWithinBounds(x: number, y: number, maxRows: number, maxCols: number): boolean {
    return x >= 0 && x < maxCols && y >= 0 && y < maxRows;
}
