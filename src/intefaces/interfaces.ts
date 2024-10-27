import WebSocket from "ws";
import { IncomingMessage, ServerResponse } from "http";

export interface JoinMessage {
    type: "join";
    groupId: string;
    senderUUID: string;
}

export interface RegularMessage {
    type: "message";
    groupIds: string[];
    text: string;
    senderUUID: string;
}

export interface GroupConnections {
    [groupId: string]: Array<{ client: WebSocket; uuid: string }>;
}

export interface IMessageService {
    getInstance(wss: WebSocket.Server): IMessageService;
    handleSocketMessage(ws: WebSocket, messageData: JoinMessage | RegularMessage): void;
    joinGroup(groupId: string, ws: WebSocket, uuid: string): void;
    handleHTTPMessage(body: any, res: ServerResponse): void;
    handleJoinMessage(messageParsed: JoinMessage, ws: WebSocket): void;
    handleRegularMessage(messageParsed: RegularMessage): void;
    sendMessageToAllSenderGroupsOnce(groupIds: string[], text: string, senderUUID: string): void;
}
