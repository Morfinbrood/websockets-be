import WebSocket from "ws";
import { IncomingMessage, ServerResponse } from "http";
import { JoinMessage, RegularMessage } from "../types/types";
import { GroupConnections } from "../intefaces/interfaces";

export class MessageService {
    private static instance: MessageService;
    private groupConnections: GroupConnections = {};

    private constructor(private wss: WebSocket.Server) { }

    public static getInstance(wss: WebSocket.Server): MessageService {
        if (!MessageService.instance) {
            MessageService.instance = new MessageService(wss);
        }
        return MessageService.instance;
    }

    public handleSocketMessage(ws: WebSocket, messageData: JoinMessage | RegularMessage) {
        let messageParsed = JSON.parse(messageData.toString());
        const { senderUUID, type } = messageParsed;
        switch (type) {
            case "join":
                const { groupId } = messageParsed;
                this.handleJoinMessage(groupId, senderUUID, ws);
                break;
            case "message":
                const { groupIds, text } = messageParsed;
                this.handleRegularMessage(groupIds, text, senderUUID);
                break;
            default:
                console.log("Unknown message type");
                break;
        }
    }

    public joinGroup(groupId: string, ws: WebSocket, uuid: string) {
        console.log(`join client uuid: ${uuid} to groupId: ${groupId}`);
        if (!this.groupConnections[groupId]) {
            this.groupConnections[groupId] = [];
        }
        this.groupConnections[groupId].push({ client: ws, uuid: uuid });
    }

    // Обработка HTTP-запроса без Express
    public handleHTTPMessage(body: any, res: ServerResponse) {
        const { groupIds, text, senderUUID } = body;
        this.handleRegularMessage(groupIds, text, senderUUID);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "success" }));
    }

    private handleJoinMessage(groupId: string, senderUUID: string, ws: WebSocket) {
        this.joinGroup(groupId, ws, senderUUID);
    }

    private handleRegularMessage(groupIds: string[], text: string, senderUUID: string) {
        if (groupIds && groupIds.length > 0) {
            this.sendMessageToAllSenderGroupsOnce(groupIds, text, senderUUID);
        } else {
            console.log("No groupIds provided");
        }
    }

    public sendMessageToAllSenderGroupsOnce(groupIds: string[], text: string, senderUUID: string) {
        const uniqueReceiversUUIDs = this.getUniqueReceiversFromAllSenderGroupsExceptSender(groupIds, senderUUID);
        uniqueReceiversUUIDs.forEach((receiverUUID: string) => {
            this.sendMessageToOnlineReceivers(receiverUUID, text, senderUUID);
        });
    }

    private getUniqueReceiversFromAllSenderGroupsExceptSender(groupIds: string[], senderUUID: string): Set<string> {
        const uniqueReceiversUUIDs: Set<string> = new Set();

        groupIds.forEach((groupId) => {
            const connections = this.groupConnections[groupId] || [];
            connections.forEach((clientInfo) => {
                if (clientInfo.uuid !== senderUUID) {
                    uniqueReceiversUUIDs.add(clientInfo.uuid);
                }
            });
        });

        return uniqueReceiversUUIDs;
    }

    private sendMessageToOnlineReceivers(receiverUUID: string, text: string, senderUUID: string) {
        const wsClient = this.getSocketClientByUuid(receiverUUID, this.groupConnections);
        if (!wsClient) return;

        if (wsClient.readyState !== WebSocket.OPEN) return;

        const messageSending = {
            type: "message",
            text: text,
        };
        console.log(`sendMessageToOnlineReceivers: text: ${text} receiverUUID: ${receiverUUID}  senderUUID: ${senderUUID}`);
        wsClient.send(JSON.stringify(messageSending));
    }

    private getSocketClientByUuid(uuid: string, groupConnections: GroupConnections) {
        const [wsSocketClient] = Object.values(groupConnections)
            .flat()
            .filter((client) => client.uuid === uuid);
        return wsSocketClient?.client;
    }
}
