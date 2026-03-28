import bcrypt from 'bcrypt';
import db, { runQuery } from './database';

async function test() {
    try {
        console.log("Testing bcrypt");
        const hash = await bcrypt.hash("test", 10);
        console.log("hash", hash);
        console.log("Testing db");
        await runQuery('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', ["test2", "test2@y.com", hash]);
        console.log("Test success!");
    } catch(err) {
        console.error("TEST FAILED:", err);
    }
}
test();
