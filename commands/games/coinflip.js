// commands/games/coinflip.js
import yukiManager from '../../managers/yukiManager.js';
import statsManager from '../../managers/statsManager.js';
import gameManager from '../../managers/gameManager.js';

async function offerDoubleOrNothing(sock, m, bet, currentMultiplier) {
    const jid = m.key.remoteJid;
    const senderId = m.key.participant || jid;
    gameManager.createSession(senderId, 'coinflip_double', { originalBet: bet, multiplier: currentMultiplier });
    const potentialWinnings = bet * currentMultiplier;
    const text = `🔥 *DOUBLE OR NOTHING?* 🔥\n\nAmbil risiko untuk memenangkan *${potentialWinnings.toLocaleString()}* Yuki?\n\nKetik *!cf double <pilihan>* atau *!cf collect*.\nContoh: *!cf double h*`;
    await sock.sendMessage(jid, { text }, { quoted: m });
}

const coinflipCommand = {
    name: 'coinflip',
    aliases: ['cf'],
    description: 'Bermain lempar koin dengan fitur rank, stat, dan Double or Nothing.',
    category: 'games',
    async execute({ sock, m, args }) {
        const jid = m.key.remoteJid;
        const senderId = m.key.participant || jid;
        const subCommand = args[0]?.toLowerCase();
        const choiceMap = { h: 'kepala', t: 'ekor', kepala: 'kepala', ekor: 'ekor' };

        switch(subCommand) {
            case 'rank': {
                const rankData = statsManager.getCoinflipRank();
                let rankText = '🏆 *TOP 5 PEMAIN COINFLIP* 🏆\n\n';
                if (rankData.length === 0) { rankText += 'Belum ada data untuk ditampilkan.';
                } else {
                    rankData.forEach((user, index) => {
                        rankText += `${index + 1}. @${user.id.split('@')[0]}\n   Menang: *${user.wins}x* | Winrate: *${user.winrate.toFixed(1)}%*\n`;
                    });
                }
                return await sock.sendMessage(jid, { text: rankText, mentions: rankData.map(u => u.id) });
            }
            case 'stat': {
                const stats = statsManager.getCoinflipStats(senderId);
                if (!stats || stats.plays === 0) return await sock.sendMessage(jid, { text: 'Kamu belum pernah bermain coinflip.' });
                const winrate = (stats.wins / stats.plays) * 100;
                let statText = `🧾 *Statistik Coinflip @${senderId.split('@')[0]}*:\n`;
                statText += `• Total main: *${stats.plays}x*\n`;
                statText += `• Menang: *${stats.wins}x*\n`;
                statText += `• Kalah: *${stats.plays - stats.wins}x*\n`;
                statText += `• Winrate: *${winrate.toFixed(1)}%*`;
                return await sock.sendMessage(jid, { text: statText, mentions: [senderId] });
            }
            case 'double': {
                const session = gameManager.getSession(senderId);
                if (!session || session.gameName !== 'coinflip_double') return;
                const userChoice = choiceMap[args[1]?.toLowerCase()];
                if (!userChoice) {
                    return await sock.sendMessage(jid, { text: `Pilihan tidak valid. Gunakan h/t/kepala/ekor.\nContoh: *!cf double kepala*`});
                }
                gameManager.closeSession(senderId);
                const result = Math.random() < 0.5 ? 'kepala' : 'ekor';
                const win = userChoice === result;
                let replyText = `🪙 *Double or Nothing Result*\n`;
                replyText += `──────────────\n`;
                replyText += `🎯 Pilihan: *${userChoice.toUpperCase()}*\n`;
                replyText += `🎲 Hasil: *${result.toUpperCase()}* ${win ? '✅' : '❌'}\n\n`;
                if (win) {
                    const prize = session.originalBet * session.multiplier;
                    yukiManager.addYuki(senderId, prize);
                    statsManager.updateCoinflipStats(senderId, true);
                    replyText += `🤯 LUAR BIASA! Kamu menang dan mendapatkan *${prize.toLocaleString()}* Yuki!`;
                    await sock.sendMessage(jid, { text: replyText });
                    offerDoubleOrNothing(sock, m, session.originalBet, session.multiplier + 0.5);
                } else {
                    statsManager.updateCoinflipStats(senderId, false);
                    replyText += `💥 BOOM! Kamu kalah dan kehilangan semuanya.`;
                    await sock.sendMessage(jid, { text: replyText });
                }
                return;
            }
            case 'collect': {
                const session = gameManager.getSession(senderId);
                if (!session || session.gameName !== 'coinflip_double') return;
                gameManager.closeSession(senderId);
                return await sock.sendMessage(jid, { text: `✅ Aman! Kamu berhasil mengumpulkan kemenanganmu.` });
            }
        }

        const userChoice = choiceMap[subCommand];
        const bet = parseInt(args[1]);
        if (!userChoice || !bet || bet <= 0) {
            return await sock.sendMessage(jid, { text: 'Format salah!\nContoh: *!cf h 100* atau *!cf kepala 100*' }, { quoted: m });
        }
        if (!yukiManager.subtractYuki(senderId, bet)) {
            return await sock.sendMessage(jid, { text: `Yuki kamu tidak cukup!` }, { quoted: m });
        }

        const result = Math.random() < 0.5 ? 'kepala' : 'ekor';
        const win = userChoice === result;
        statsManager.updateCoinflipStats(senderId, win);
        let replyText = `🪙 *Coinflip Result*\n`;
        replyText += `──────────────\n`;
        replyText += `🎯 Pilihan: *${userChoice.toUpperCase()}*\n`;
        replyText += `🎲 Hasil: *${result.toUpperCase()}* ${win ? '✅' : '❌'}\n`;
        if (win) {
            const winnings = bet * 2;
            yukiManager.addYuki(senderId, winnings);
            replyText += `💸 Kamu menang *${winnings.toLocaleString()}* Yuki.`;
            await sock.sendMessage(jid, { text: replyText }, { quoted: m });
            offerDoubleOrNothing(sock, m, bet, 2.5);
        } else {
            replyText += `💸 Kamu kalah *${bet.toLocaleString()}* Yuki.`;
            await sock.sendMessage(jid, { text: replyText }, { quoted: m });
        }
    }
};
export default coinflipCommand;