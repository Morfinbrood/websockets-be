import { User } from "../intefaces/interfaces"

class MemoryDb {
    private users: User[] = [];

    public addUser(name: string, password: string): User {
        const index = this.users.length + 1;

        const newUser = { name, password, index };
        this.users.push(newUser);
        console.log(`after added users : ${this.users}`)
        return newUser;
    }

    public getUserByIndex(index: number): User | undefined {
        return this.users.find(user => user.index === index);
    }

    public getUserByName(name: string): User | undefined {
        console.log(`all users before findUserByName: ${this.users}`)
        return this.users.find(user => user.name === name);
    }

    public getAllUsers(): User[] {
        return this.users;
    }
}

const memoryDb = new MemoryDb();
export default memoryDb;
