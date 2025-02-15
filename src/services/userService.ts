import memoryDb from "../db/memoryDB";
import { User } from "../models/user";

class UserService {
    public addUser(name: string, password: string): User | null {
        const existingUser = memoryDb.getUserByName(name);
        if (existingUser) {
            console.log(`User with name ${name} already exists.`);
            return null;
        }
        return memoryDb.addUser(name, password);
    }

    public getUserByIndex(index: number): User | undefined {
        return memoryDb.getUserByIndex(index);
    }

    public getUserByName(name: string): User | undefined {
        return memoryDb.getUserByName(name);
    }

    public getAllUsers(): User[] {
        return memoryDb.getAllUsers();
    }
}

export default new UserService();
