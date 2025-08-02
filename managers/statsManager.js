// managers/statsManager.js
import fs from 'fs';
const DB_PATH = './users.json';

// --- FUNGSI DATABASE (dideklarasikan sekali di atas) ---
function readDB() {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
}

function writeDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}
// --- AKHIR FUNGSI DATABASE ---


// --- FUNGSI BANTUAN ---
// checkStats sekarang lengkap dengan semua properti dari semua game
function checkStats(userObject) {
    if (userObject.cf_plays === undefined) userObject.cf_plays = 0;
    if (userObject.cf_wins === undefined) userObject.cf_wins = 0;
    if (userObject.roulette_plays === undefined) userObject.roulette_plays = 0;
    if (userObject.roulette_winnings === undefined) userObject.roulette_winnings = 0;
    if (userObject.suit_plays === undefined) userObject.suit_plays = 0;
    if (userObject.suit_wins === undefined) userObject.suit_wins = 0;
    if (userObject.suit_history === undefined) userObject.suit_history = [];
}
// --- AKHIR FUNGSI BANTUAN ---


const statsManager = {
    // === COINFLIP STATS ===
    updateCoinflipStats: (userId, didWin) => {
        const db = readDB();
        if (!db[userId]) return;
        checkStats(db[userId]);
        db[userId].cf_plays += 1;
        if (didWin) { db[userId].cf_wins += 1; }
        writeDB(db);
    },
    getCoinflipStats: (userId) => {
        const db = readDB();
        if (!db[userId]) return null;
        checkStats(db[userId]);
        return { plays: db[userId].cf_plays, wins: db[userId].cf_wins };
    },
    getCoinflipRank: () => {
        const db = readDB();
        const users = Object.keys(db).map(userId => {
            const user = db[userId];
            checkStats(user);
            const winrate = user.cf_plays > 0 ? (user.cf_wins / user.cf_plays) * 100 : 0;
            return { id: userId, wins: user.cf_wins, plays: user.cf_plays, winrate: winrate };
        });
        users.sort((a, b) => b.wins - a.wins);
        return users.slice(0, 5);
    },

    // === ROULETTE STATS ===
    updateRouletteStats: (userId, netWinnings) => {
        const db = readDB();
        if (!db[userId]) return;
        checkStats(db[userId]);
        db[userId].roulette_plays += 1;
        db[userId].roulette_winnings += netWinnings; // netWinnings bisa positif atau negatif
        writeDB(db);
    },
    getRouletteStats: (userId) => {
        const db = readDB();
        if (!db[userId]) return null;
        checkStats(db[userId]);
        return { plays: db[userId].roulette_plays, winnings: db[userId].roulette_winnings };
    },
    getRouletteRank: () => {
        const db = readDB();
        const users = Object.keys(db).map(userId => {
            const user = db[userId];
            checkStats(user);
            return { id: userId, plays: user.roulette_plays, winnings: user.roulette_winnings };
        });
        users.sort((a, b) => b.winnings - a.winnings);
        return users.slice(0, 5);
    },

    // === SUIT STATS ===
    updateSuitStats: (winnerId, loserId) => {
        const db = readDB();
        if (db[winnerId]) {
            checkStats(db[winnerId]);
            db[winnerId].suit_plays += 1;
            db[winnerId].suit_wins += 1;
        }
        if (db[loserId]) {
            checkStats(db[loserId]);
            db[loserId].suit_plays += 1;
        }
        writeDB(db);
    },
    
    addSuitHistory: (userId, opponentName, result) => {
        const db = readDB();
        if (!db[userId]) return;
        checkStats(db[userId]);
        db[userId].suit_history.unshift({ opponent: opponentName, result });
        if (db[userId].suit_history.length > 5) {
            db[userId].suit_history.pop();
        }
        writeDB(db);
    },

    getSuitStats: (userId) => {
        const db = readDB();
        if (!db[userId]) return null;
        checkStats(db[userId]);
        return { plays: db[userId].suit_plays, wins: db[userId].suit_wins };
    },

    getSuitRank: () => {
        const db = readDB();
        const users = Object.keys(db).map(userId => {
            const user = db[userId];
            checkStats(user);
            return { id: userId, wins: user.suit_wins, plays: user.suit_plays };
        });
        users.sort((a, b) => b.wins - a.wins);
        return users.slice(0, 5);
    },
    
    getSuitHistory: (userId) => {
        const db = readDB();
        if (!db[userId]) return [];
        checkStats(db[userId]);
        return db[userId].suit_history;
    }
};

export default statsManager;