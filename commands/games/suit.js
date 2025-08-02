// commands/games/suit.js
import gameManager from '../../managers/gameManager.js';
import yukiManager from '../../managers/yukiManager.js';
import statsManager from '../../managers/statsManager.js';
import ui from '../../utils/ui.js';

const choices = ['batu', 'gunting', 'kertas'];
const winMap = { batu: 'gunting', gunting: 'kertas', kertas: 'batu' };
const medals = ['🥇', '🥈', '🥉'];
const cheatCode = 'cheat01';

async function processGameResult(sock, jid, session) {
    const { challenger, challenged } = session;
    if (challenger.choice === cheatCode) {
        challenger.choice = Object.keys(winMap).find(key => winMap[key] === challenged.choice) || 'kertas';
    }
    if (challenged.choice === cheatCode) {
        challenged.choice = Object.keys(winMap).find(key => winMap[key] === challenger.choice) || 'kertas';
    }
    
    const p1Choice = challenger.choice;
    const p2Choice = challenged.choice;
    let winnerId, loserId, resultText;

    if (p1Choice === p2Choice) {
        yukiManager.addYuki(challenger.id, challenger.bet);
        resultText = 'Hasilnya SERI! Taruhan dikembalikan.';
    } else if (winMap[p1Choice] === p2Choice) {
        winnerId = challenger.id;
        loserId = challenged.id;
        const prize = challenger.bet * 2;
        yukiManager.addYuki(winnerId, prize);
        resultText = `@${winnerId.split('@')[0]} menang dan mendapatkan *${prize}* Yuki!`;
    } else {
        winnerId = challenged.id;
        loserId = challenger.id;
        const prize = challenger.bet * 2
        yukiManager.addYuki(winnerId, prize);
        resultText = `@${winnerId.split('@')[0]} membalikkan keadaan dan memenangkan taruhan *${prize}* Yuki!`;
    }

    let fullResult = `💥 HASIL DUEL SUIT 💥\n\n`;
    fullResult += `@${challenger.id.split('@')[0]} memilih: *${p1Choice.toUpperCase()}*\n`;
    fullResult += `@${challenged.id.split('@')[0]} memilih: *${p2Choice.toUpperCase()}*\n\n`;
    fullResult += resultText;
    await sock.sendMessage(jid, { text: fullResult, mentions: [challenger.id, challenged.id] });

    if (winnerId && loserId) {
        statsManager.updateSuitStats(winnerId, loserId);
        statsManager.addSuitHistory(winnerId, challenged.name, 'win');
        statsManager.addSuitHistory(loserId, challenger.name, 'loss');
    }
    gameManager.closeSession(jid);
}

const suitCommand = {
    name: 'suit',
    description: 'Bermain suit PvP dengan pemain lain.',
    category: 'games',
    async execute({ sock, m, args }) {
        const jid = m.key.remoteJid;
        const senderId = m.key.participant || jid;
        const senderName = m.pushName || senderId.split('@')[0];
        const isDM = !jid.endsWith('@g.us');

        if (isDM) {
            const choice = args[0]?.toLowerCase();
            if (![...choices, cheatCode].includes(choice)) return;
            const session = gameManager.findSessionByParticipant(senderId);
            if (!session || session.gameName !== 'suit_pvp' || session.status !== 'waiting_choices') return;
            const playerRole = session.challenger.id === senderId ? 'challenger' : 'challenged';
            if (session[playerRole].choice) return sock.sendMessage(senderId, { text: 'Kamu sudah memilih!' });
            session[playerRole].choice = choice;
            await sock.sendMessage(senderId, { text: `Pilihanmu *${choice}* telah disimpan! Menunggu lawan...` });
            if (session.challenger.choice && session.challenged.choice) {
                clearTimeout(session.timeout);
                await processGameResult(sock, session.jid, session);
            }
            return;
        }

        const subCommand = args[0]?.toLowerCase();
        switch(subCommand) {
            case 'terima': {
                const session = gameManager.findSessionByChallenged(senderId);
                if (!session || session.status !== 'pending_acceptance') return sock.sendMessage(jid, { text: 'Tidak ada tantangan untukmu saat ini.' });
                clearTimeout(session.timeout);
                session.status = 'waiting_choices';
                await sock.sendMessage(jid, { text: `🤝 Tantangan diterima! @${session.challenger.id.split('@')[0]} vs @${senderId.split('@')[0]}\n\nBot telah mengirimkan pesan pribadi. Silakan cek DM dan pilih Gunting/Batu/Kertas! Waktu memilih 3 menit.`, mentions: [session.challenger.id, senderId] });
                await sock.sendMessage(session.challenger.id, { text: `Lawanmu telah menerima tantangan! Balas pesan ini dengan pilihanmu (batu/gunting/kertas).` });
                await sock.sendMessage(senderId, { text: `Kamu menerima tantangan! Balas pesan ini dengan pilihanmu (batu/gunting/kertas).` });
                session.timeout = setTimeout(async () => {
                    const currentSession = gameManager.getSession(session.jid);
                    if(currentSession && currentSession.status === 'waiting_choices') {
                        let winner, loser, bet;
                        if (!currentSession.challenger.choice && currentSession.challenged.choice) {
                            winner = currentSession.challenged;
                            loser = currentSession.challenger;
                        } else if (currentSession.challenger.choice && !currentSession.challenged.choice) {
                            winner = currentSession.challenger;
                            loser = currentSession.challenged;
                        } else { // Both didn't choose or something went wrong
                            yukiManager.addYuki(currentSession.challenger.id, currentSession.challenger.bet);
                            await sock.sendMessage(jid, { text: `Waktu habis dan tidak ada pemenang. Taruhan dikembalikan.` });
                            gameManager.closeSession(session.jid);
                            return;
                        }
                        bet = currentSession.challenger.bet;
                        const prize = bet * 2;
                        yukiManager.addYuki(winner.id, prize);
                        statsManager.updateSuitStats(winner.id, loser.id);
                        statsManager.addSuitHistory(winner.id, loser.name, 'win');
                        statsManager.addSuitHistory(loser.id, winner.name, 'loss');
                        await sock.sendMessage(jid, {text: `Waktu habis! @${loser.id.split('@')[0]} tidak memilih dan dianggap kalah. @${winner.id.split('@')[0]} memenangkan *${prize}* Yuki!`, mentions: [loser.id, winner.id]});
                        gameManager.closeSession(session.jid);
                    }
                }, 180000);
                return;
            }
            case 'rank': {
                const rankData = statsManager.getSuitRank();
                let rankText = '🏆 *TOP 5 PEMAIN SUIT* 🏆\n\n';
                if (rankData.length === 0) { rankText += 'Belum ada data.'; } 
                else { rankData.forEach((user, index) => { rankText += `${medals[index] || '▫️'} @${user.id.split('@')[0]} - *${user.wins}* Menang\n`; }); }
                return sock.sendMessage(jid, { text: rankText, mentions: rankData.map(u => u.id) });
            }
            case 'stat': {
                const stats = statsManager.getSuitStats(senderId);
                const statText = ui.formatSuitStats(stats, senderName);
                return sock.sendMessage(jid, { text: statText, mentions: [senderId] });
            }
            case 'history': {
                const history = statsManager.getSuitHistory(senderId);
                const historyText = ui.formatSuitHistory(history, senderName);
                const mentions = history.map(h => `${h.opponent.split('@')[0]}@s.whatsapp.net`).filter(id => id.includes('@'));
                return sock.sendMessage(jid, { text: historyText, mentions: [...new Set(mentions)] });
            }
        }
        
        const mentionedJid = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const bet = parseInt(args.find(arg => !isNaN(parseInt(arg))));
        if (!mentionedJid || !bet || bet <= 0) return sock.sendMessage(jid, { text: 'Format salah! Contoh: *!suit @lawan 100*' });
        if (mentionedJid === senderId) return sock.sendMessage(jid, { text: 'Tidak bisa menantang diri sendiri!' });
        if (gameManager.findSessionByParticipant(senderId) || gameManager.findSessionByParticipant(mentionedJid)) {
            return sock.sendMessage(jid, { text: 'Salah satu pemain sedang dalam permainan lain.' });
        }
        if (!yukiManager.subtractYuki(senderId, bet)) return sock.sendMessage(jid, { text: 'Yuki kamu tidak cukup!' });

        const rank = statsManager.getSuitRank();
        const challengerRank = rank.findIndex(p => p.id === senderId);
        const challengedRank = rank.findIndex(p => p.id === mentionedJid);
        const challengerTitle = challengerRank !== -1 && challengerRank < 3 ? `Top Tier ${medals[challengerRank]}` : '';
        const challengedTitle = challengedRank !== -1 && challengedRank < 3 ? `Top Tier ${medals[challengedRank]}` : '';
        const challengerName = `${challengerTitle} @${senderId.split('@')[0]}`;
        const challengedName = `${challengedTitle} @${mentionedJid.split('@')[0]}`;

        let challengedNamePlain = mentionedJid.split('@')[0];
        try {
            const contact = await sock.getContact(mentionedJid);
            challengedNamePlain = contact.notify || contact.name || challengedNamePlain;
        } catch (e) { console.log("Could not get contact name for history."); }

        const sessionData = {
            jid: jid, status: 'pending_acceptance',
            challenger: { id: senderId, name: senderName, bet, choice: null },
            challenged: { id: mentionedJid, name: challengedNamePlain, choice: null },
            timeout: null
        };
        const jidSession = gameManager.createSession(jid, 'suit_pvp', sessionData);
        if(!jidSession.success) {
            yukiManager.addYuki(senderId, bet);
            return sock.sendMessage(jid, {text: jidSession.message});
        }
        
        const currentSession = gameManager.getSession(jid);
        currentSession.timeout = setTimeout(() => {
            const sessionCheck = gameManager.getSession(jid);
            if (sessionCheck && sessionCheck.status === 'pending_acceptance') {
                yukiManager.addYuki(senderId, bet);
                sock.sendMessage(jid, { text: `Tantangan untuk @${mentionedJid.split('@')[0]} telah kedaluwarsa.`, mentions: [mentionedJid] });
                gameManager.closeSession(jid);
            }
        }, 60000);
        await sock.sendMessage(jid, { text: `⚔️ DUEL SUIT! ⚔️\n\n${challengerName} menantang ${challengedName} untuk bertaruh *${bet}* Yuki!\n\n@${mentionedJid.split('@')[0]}, apakah kamu menerima tantangan ini? Ketik *!suit terima* dalam 1 menit.`, mentions: [senderId, mentionedJid] });
    }
};

export default suitCommand;