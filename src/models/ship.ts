export interface Ship {
    position: { x: number, y: number };  // Координаты верхней левой части корабля
    direction: boolean;                  // Направление: true — горизонтально, false — вертикально
    length: number;                      // Длина корабля в клетках
    type: "small" | "medium" | "large" | "huge";  // Тип корабля (например, малый, средний, крупный)
    hits: number;                        // Количество попаданий, полученных кораблем
}