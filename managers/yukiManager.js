// managers/yukiManager.js
import fs from 'fs';
const DB_PATH = './users.json';

if (!fs.existsSync(DB_PATH) || fs.readFileSync(DB_PATH, 'utf8') === '') {
    fs.writeFileSync(DB_PATH, JSON.stringify({}));
}

function readDB() {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
}

function writeDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}
function checkUser(userId) {
    const db = readDB();
    if (!db[userId]) {
        db[userId] = { 
            yuki: 100,
            cf_plays: 0, cf_wins: 0,
            roulette_plays: 0, roulette_winnings: 0,
            // Menambahkan properti statistik awal untuk Suit
            suit_plays: 0, suit_wins: 0, suit_history: []
        };
        writeDB(db);
    }
}

function readDB() {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
}
function writeDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}
function checkUser(userId) {
    const db = readDB();
    if (!db[userId]) {
        db[userId] = { 
            yuki: 100,
            cf_plays: 0,
            cf_wins: 0,
            // Menambahkan properti statistik awal untuk Roulette
            roulette_plays: 0,
            roulette_winnings: 0, // Total yuki yang dimenangkan
        };
        writeDB(db);
    }
}

const yukiManager = {
    getYuki: (userId) => {
        checkUser(userId);
        const db = readDB();
        return db[userId].yuki;
    },
    addYuki: (userId, amount) => {
        checkUser(userId);
        const db = readDB();
        db[userId].yuki += amount;
        writeDB(db);
        return db[userId].yuki;
    },
    subtractYuki: (userId, amount) => {
        checkUser(userId);
        const db = readDB();
        if (db[userId].yuki < amount) {
            return false;
        }
        db[userId].yuki -= amount;
        writeDB(db);
        return true;
    },
};

export default yukiManager;