// commands/games/blackjack.js
import gameManager from '../../managers/gameManager.js';
import yukiManager from '../../managers/yukiManager.js';

// --- FUNGSI BANTUAN UNTUK BLACKJACK ---
const dealers = ['Mikasa Ackerman', 'Hatsune Miku', 'Kaneki Ken', 'Elon Musk'];

const createDeck = () => {
    const suits = ['♠️', '♥️', '♦️', '♣️'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    let deck = [];
    for (let suit of suits) { for (let value of values) { deck.push({ suit, value }); } }
    return deck.sort(() => Math.random() - 0.5);
};

const calculateScore = (hand) => {
    let score = 0; let aces = 0;
    hand.forEach(card => {
        if (card.value === 'A') { aces++; score += 11; } 
        else if (['J', 'Q', 'K'].includes(card.value)) { score += 10; } 
        else { score += parseInt(card.value); }
    });
    while (score > 21 && aces > 0) { score -= 10; aces--; }
    return score;
};

const formatHand = (hand) => hand.map(c => c.value + c.suit).join(' | ');

// --- KODE PERINTAH UTAMA ---
const blackjackCommand = {
    name: 'blackjack',
    aliases: ['bj'],
    description: 'Bermain Blackjack multiplayer melawan bandar ikonik.',
    category: 'games',
    async execute({ sock, m, args }) {
        const jid = m.key.remoteJid;
        const senderId = m.key.participant || jid;
        const subCommand = args[0]?.toLowerCase();
        
        const session = gameManager.getSession(jid);

        switch(subCommand) {
            case 'start': {
                if (session) return sock.sendMessage(jid, { text: `Masih ada permainan ${session.gameName} yang sedang berlangsung.` });
                const dealerName = dealers[Math.floor(Math.random() * dealers.length)];
                gameManager.createSession(jid, 'blackjack', {
                    status: 'betting', host: senderId, dealer: { name: dealerName, hand: [] }, players: {}, deck: createDeck(),
                });
                return sock.sendMessage(jid, { text: `🃏 Meja Blackjack telah dibuka oleh @${senderId.split('@')[0]}!\nBandar malam ini: *${dealerName}*.\n\nPemain lain silakan bergabung dengan mengetik:\n*!bj bet <jumlah>* (Maks 3 pemain)` , mentions: [senderId]});
            }

            case 'bet': {
                if (!session || session.gameName !== 'blackjack') return sock.sendMessage(jid, { text: 'Tidak ada meja Blackjack yang aktif. Mulai dengan *!bj start*.' });
                if (session.status !== 'betting') return sock.sendMessage(jid, { text: 'Sesi taruhan sudah ditutup.' });
                if (Object.keys(session.players).length >= 3 && !session.players[senderId]) return sock.sendMessage(jid, { text: 'Maaf, meja sudah penuh (Maks 3 pemain).' });
                if (session.players[senderId]) return sock.sendMessage(jid, { text: 'Anda sudah berada di meja ini.' });
                const betAmount = parseInt(args[1]);
                if (!betAmount || betAmount <= 0) return sock.sendMessage(jid, { text: 'Harap masukkan jumlah taruhan yang valid.' });
                if (!yukiManager.subtractYuki(senderId, betAmount)) return sock.sendMessage(jid, { text: 'Yuki Anda tidak cukup untuk bertaruh.' });
                session.players[senderId] = { bet: betAmount, hand: [], status: 'playing' };
                gameManager.updateSession(jid, session);
                let reply = `✅ @${senderId.split('@')[0]} telah bergabung ke meja dengan taruhan *${betAmount}* Yuki.\n\nPemain saat ini: ${Object.keys(session.players).length}/3`;
                if (Object.keys(session.players).length >= 3) {
                    reply += `\n\nMeja penuh! Host (@${session.host.split('@')[0]}) silakan ketik *!bj deal* untuk memulai permainan.`;
                }
                return sock.sendMessage(jid, { text: reply, mentions: [senderId, session.host] });
            }
            
            case 'deal': {
                if (!session || session.gameName !== 'blackjack') return;
                if (senderId !== session.host) return sock.sendMessage(jid, { text: 'Hanya host yang bisa memulai permainan.' });
                if (session.status !== 'betting') return sock.sendMessage(jid, { text: 'Permainan sudah dimulai.' });
                if (Object.keys(session.players).length === 0) return sock.sendMessage(jid, { text: 'Tidak ada pemain yang bergabung. Permainan dibatalkan.' });

                session.status = 'playing';
                Object.keys(session.players).forEach(pId => { session.players[pId].hand.push(session.deck.pop(), session.deck.pop()); });
                session.dealer.hand.push(session.deck.pop(), session.deck.pop());

                let output = "🎰 ─── BLACKJACK NIGHT ───\n";
                output += `👤 Dealer: 🎩 ${session.dealer.name}\n`;
                output += `🎴 Kartu Dealer: [${formatHand([session.dealer.hand[0]])}] + [?]\n\n`;
                output += "🎮 PEMAIN:\n";
                let allPlayersBlackjack = true;

                for (const pId in session.players) {
                    const player = session.players[pId];
                    const score = calculateScore(player.hand);
                    output += `👤 @${pId.split('@')[0]}\n`;
                    output += `   🎴 Tangan: [${formatHand(player.hand)}]\n`;
                    output += `   🧮 Skor: ${score}\n`;

                    if (score === 21) {
                        player.status = 'blackjack';
                        const winnings = player.bet * 3;
                        yukiManager.addYuki(pId, winnings);
                        output += `   💥 BLACKJACK! Kamu menang ${winnings} 💰 Yuki!\n\n`;
                    } else {
                        allPlayersBlackjack = false;
                        output += `\n`;
                    }
                }
                
                if (allPlayersBlackjack) {
                    output += "Semua pemain mendapatkan Blackjack! Permainan selesai.";
                    gameManager.closeSession(jid);
                } else {
                    const firstPlayerId = Object.keys(session.players).find(pId => session.players[pId].status === 'playing');
                    if (firstPlayerId) {
                        session.turn = firstPlayerId;
                        output += `🎯 Giliran @${firstPlayerId.split('@')[0]} sekarang!\n`;
                        output += `Ketik *!bj hit* untuk tambah kartu atau *!bj stand* untuk berhenti.`;
                    } else {
                        output += "Tidak ada pemain tersisa, permainan selesai.";
                        gameManager.closeSession(jid);
                    }
                }
                gameManager.updateSession(jid, session);
                return sock.sendMessage(jid, { text: output, mentions: Object.keys(session.players) });
            }

            case 'hit':
            case 'stand': {
                return sock.sendMessage(jid, {text: `Logika untuk !bj hit dan !bj stand multiplayer sedang dikembangkan.`});
            }

            default:
                return sock.sendMessage(jid, { text: 'Perintah tidak valid. Gunakan: *!bj start*, *!bj bet <jumlah>*, atau *!bj deal*.' });
        }
    }
};

export default blackjackCommand;