// commands/games/roulette.js
import gameManager from '../../managers/gameManager.js';
import yukiManager from '../../managers/yukiManager.js';
import statsManager from '../../managers/statsManager.js';
import ui from '../../utils/ui.js';

const dealers = ['Bernard Arnault', 'Elon Musk', 'Jeff Bezos', 'Mark Zuckerberg'];
const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const medals = ['🥇', '🥈', '🥉'];

const getNumberInfo = (number) => {
    if (number === 0) return { color: 'hijau', parity: 'netral', range: 'netral' };
    return {
        color: redNumbers.includes(number) ? 'merah' : 'hitam',
        parity: number % 2 === 0 ? 'genap' : 'ganjil',
        range: number >= 1 && number <= 18 ? 'rendah' : 'tinggi'
    };
};

const calculateWinnings = (bets, winningNumber, numberInfo) => {
    let totalWinnings = 0;
    bets.forEach(bet => {
        let win = false;
        let payoutRatio = 0;
        switch (bet.type) {
            case 'angka': if (bet.choice == winningNumber) { win = true; payoutRatio = 35; } break;
            case 'warna': if (bet.choice === numberInfo.color) { win = true; payoutRatio = 1; } break;
            case 'paritas': if (bet.choice === numberInfo.parity) { win = true; payoutRatio = 1; } break;
            case 'range': if (bet.choice === numberInfo.range) { win = true; payoutRatio = 1; } break;
        }
        if (win) { totalWinnings += bet.amount + (bet.amount * payoutRatio); }
    });
    return totalWinnings;
};

const parseBets = (args) => {
    const bets = [];
    const keywords = {
        'merah': { type: 'warna', choice: 'merah' }, 'hitam': { type: 'warna', choice: 'hitam' },
        'ganjil': { type: 'paritas', choice: 'ganjil' }, 'genap': { type: 'paritas', choice: 'genap' },
        'rendah': { type: 'range', choice: 'rendah' }, 'tinggi': { type: 'range', choice: 'tinggi' },
        '1-18': { type: 'range', choice: 'rendah' }, '19-36': { type: 'range', choice: 'tinggi' }
    };
    args.forEach(arg => {
        const lowerArg = arg.toLowerCase();
        if (keywords[lowerArg]) { bets.push(keywords[lowerArg]); } 
        else if (!isNaN(parseInt(arg)) && parseInt(arg) >= 0 && parseInt(arg) <= 36) {
            bets.push({ type: 'angka', choice: parseInt(arg) });
        }
    });
    return bets;
};

const rouletteCommand = {
    name: 'roulette',
    description: 'Bermain roulette dengan berbagai jenis taruhan.',
    category: 'games',
    async execute({ sock, m, args }) {
        const jid = m.key.remoteJid;
        const senderId = m.key.participant || jid;
        const subCommand = args[0]?.toLowerCase();
        const session = gameManager.getSession(jid);

        if (!subCommand) {
            if (session) return sock.sendMessage(jid, { text: `Masih ada permainan ${session.gameName} yang berlangsung.` });
            const dealerName = dealers[Math.floor(Math.random() * dealers.length)];
            const newSession = { status: 'betting', host: senderId, dealer: dealerName, players: {} };
            gameManager.createSession(jid, 'roulette', newSession);
            const openMessage = ui.formatRouletteTableOpen(newSession, senderId);
            return sock.sendMessage(jid, { text: openMessage, mentions: [senderId] });
        }

        switch(subCommand) {
            case 'bet': {
                if (!session || session.status !== 'betting') return sock.sendMessage(jid, { text: 'Tidak ada sesi taruhan Roulette yang aktif.' });
                if (Object.keys(session.players).length >= 4 && !session.players[senderId]) return sock.sendMessage(jid, { text: 'Maaf, meja sudah penuh (Maks 4 pemain).' });
                const betArgs = args.slice(1, -1);
                const betAmount = parseInt(args[args.length - 1]);
                const parsedBets = parseBets(betArgs);
                if (parsedBets.length === 0 || !betAmount || betAmount <= 0) return sock.sendMessage(jid, { text: `Format taruhan salah.\nContoh: *!roulette bet warna merah 100*` });
                const totalBetAmount = betAmount * parsedBets.length;
                if (!yukiManager.subtractYuki(senderId, totalBetAmount)) return sock.sendMessage(jid, { text: `Yuki Anda tidak cukup untuk total taruhan ${totalBetAmount}.` });
                if (!session.players[senderId]) session.players[senderId] = { bets: [] };
                parsedBets.forEach(bet => { session.players[senderId].bets.push({ ...bet, amount: betAmount }); });
                const rank = statsManager.getRouletteRank();
                const playerRankIndex = rank.findIndex(p => p.id === senderId);
                const medal = playerRankIndex !== -1 && playerRankIndex < 3 ? medals[playerRankIndex] : '';
                const betSummary = parsedBets.map(b => `${b.type} ${b.choice}`).join(', ');
                return sock.sendMessage(jid, { text: `✅ @${senderId.split('@')[0]}${medal} memasang taruhan *${betAmount}* Yuki pada *${betSummary}*.\nTotal potongan: *${totalBetAmount}* Yuki.`, mentions: [senderId] });
            }
            case 'spin': {
                if (!session || senderId !== session.host) return sock.sendMessage(jid, { text: 'Hanya host yang bisa memutar roda.' });
                if (session.status !== 'betting') return;
                await sock.sendMessage(jid, { text: `🎡 Roda segera berputar... Semoga beruntung!\n──────────────────────────` });
                await new Promise(resolve => setTimeout(resolve, 5000));
                session.status = 'finished';
                const winningNumber = Math.floor(Math.random() * 37);
                const numberInfo = getNumberInfo(winningNumber);
                const playerResults = {};
                for (const pId in session.players) {
                    const player = session.players[pId];
                    const winnings = calculateWinnings(player.bets, winningNumber, numberInfo);
                    const totalBet = player.bets.reduce((sum, b) => sum + b.amount, 0);
                    if (winnings > 0) yukiManager.addYuki(pId, winnings);
                    statsManager.updateRouletteStats(pId, winnings - totalBet);
                    playerResults[pId] = { winnings, totalBet };
                }
                const { text, mentions } = ui.formatRouletteSpinResult(session, winningNumber, numberInfo, playerResults);
                gameManager.closeSession(jid);
                return sock.sendMessage(jid, { text, mentions });
            }
            case 'rank': case 'stat': {
                return sock.sendMessage(jid, { text: `Fitur ${subCommand} sedang dalam pengembangan.` });
            }
            default:
                return sock.sendMessage(jid, { text: 'Perintah Roulette tidak valid.' });
        }
    }
};

export default rouletteCommand;