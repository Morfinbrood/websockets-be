import WebSocket from "ws";

class UserConnections {
    private userConnections: Map<WebSocket, number> = new Map();
    private wsConnections: Map<number, WebSocket> = new Map();

    public addConnection(ws: WebSocket, userIndex: number) {
        this.userConnections.set(ws, userIndex);
        this.wsConnections.set(userIndex, ws);
    }

    public getUserIndex(ws: WebSocket): number | undefined {
        return this.userConnections.get(ws);
    }

    public getWs(userIndex: number): WebSocket | undefined {
        return this.wsConnections.get(userIndex);
    }

    public getAllConnections(): Map<number, WebSocket> {
        return this.wsConnections;
    }
}

export default new UserConnections();
