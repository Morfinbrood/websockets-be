import { User } from "../models/user";

class MemoryDb {
    private users: User[] = [];
    private rooms: { [key: number]: User[] } = {};

    public addUser(name: string, password: string): User {
        const index = this.users.length + 1;
        const newUser = { name, password, index };
        this.users.push(newUser);
        return newUser;
    }

    public getUserByIndex(index: number): User | undefined {
        return this.users.find(user => user.index === index);
    }

    public getUserByName(name: string): User | undefined {
        return this.users.find(user => user.name === name);
    }

    public getAllUsers(): User[] {
        return this.users;
    }

    public isUserInRoom(user: User): boolean {
        return Object.values(this.rooms).some(roomUsers =>
            roomUsers.some(roomUser => roomUser.index === user.index)
        );
    }

    public createRoom(user: User): number | null {
        if (this.isUserInRoom(user)) {
            console.log(`User ${user.name} is already in a room and cannot create another.`);
            return null;
        }

        const roomIndex = Object.keys(this.rooms).length + 1;
        this.rooms[roomIndex] = [user];
        console.log(`User ${user.name} added to room ${roomIndex}`);
        return roomIndex;
    }

    public getRooms(): { [key: number]: User[] } {
        return this.rooms;
    }
}

const memoryDb = new MemoryDb();
export default memoryDb;
