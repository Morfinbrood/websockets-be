import WebSocket from "ws";
import { RegistrationMessage } from "../types/types";
import { GroupConnections } from "../intefaces/interfaces";
import memoryDb from "../db/memoryDB";

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

    public handleSocketMessage(ws: WebSocket, messageData: RegistrationMessage) {
        let messageParsed = JSON.parse(messageData.toString());
        const { type, data } = messageParsed;

        switch (type) {
            case "reg":
                const parsedData = JSON.parse(data);
                this.handleRegistration(parsedData, ws);
                console.log('reg message handler');
                break;
            default:
                console.log("Unknown message type");
                break;
        }
    }

    private handleRegistration(data: { name: string, password: string }, ws: WebSocket) {
        const { name, password } = data;
        const existingUser = memoryDb.getUserByName(name);
        let response;

        if (existingUser) {
            response = {
                type: "reg",
                data: JSON.stringify({
                    name: existingUser.name,
                    index: existingUser.index,
                    error: true,
                    errorText: "User already registered."
                }),
                id: 0,
            };
        } else {
            console.log(`try to add new user name: ${name} pass: ${password}`)
            const newUser = memoryDb.addUser(name, password);
            console.log(`Registered new user: ${JSON.stringify(newUser)}`);
            response = {
                type: "reg",
                data: JSON.stringify({
                    name: newUser.name,
                    index: newUser,
                    error: false,
                    errorText: "",
                }),
                id: 0,
            };
        }

        ws.send(JSON.stringify(response));
    }

    // public joinGroup(groupId: string, ws: WebSocket, uuid: string) {
    //     console.log(`join client uuid: ${uuid} to groupId: ${groupId}`);
    //     if (!this.groupConnections[groupId]) {
    //         this.groupConnections[groupId] = [];
    //     }
    //     this.groupConnections[groupId].push({ client: ws, uuid: uuid });
    // }

    // public sendMessageToAllSenderGroupsOnce(groupIds: string[], text: string, senderUUID: string) {
    //     const uniqueReceiversUUIDs = this.getUniqueReceiversFromAllSenderGroupsExceptSender(groupIds, senderUUID);
    //     uniqueReceiversUUIDs.forEach((receiverUUID: string) => {
    //         this.sendMessageToOnlineReceivers(receiverUUID, text, senderUUID);
    //     });
    // }

    // private getUniqueReceiversFromAllSenderGroupsExceptSender(groupIds: string[], senderUUID: string): Set<string> {
    //     const uniqueReceiversUUIDs: Set<string> = new Set();

    //     groupIds.forEach((groupId) => {
    //         const connections = this.groupConnections[groupId] || [];
    //         connections.forEach((clientInfo) => {
    //             if (clientInfo.uuid !== senderUUID) {
    //                 uniqueReceiversUUIDs.add(clientInfo.uuid);
    //             }
    //         });
    //     });

    //     return uniqueReceiversUUIDs;
    // }

    // private sendMessageToOnlineReceivers(receiverUUID: string, text: string, senderUUID: string) {
    //     const wsClient = this.getSocketClientByUuid(receiverUUID, this.groupConnections);
    //     if (!wsClient) return;

    //     if (wsClient.readyState !== WebSocket.OPEN) return;

    //     const messageSending = {
    //         type: "message",
    //         text: text,
    //     };
    //     console.log(`sendMessageToOnlineReceivers: text: ${text} receiverUUID: ${receiverUUID}  senderUUID: ${senderUUID}`);
    //     wsClient.send(JSON.stringify(messageSending));
    // }

    // private getSocketClientByUuid(uuid: string, groupConnections: GroupConnections) {
    //     const [wsSocketClient] = Object.values(groupConnections)
    //         .flat()
    //         .filter((client) => client.uuid === uuid);
    //     return wsSocketClient?.client;
    // }
}
