// utils/ui.js

const ui = {
    /**
     * Membuat format menu bantuan yang dikelompokkan berdasarkan kategori.
     * @param {Map<string, object>} commands - Koleksi semua perintah bot.
     * @returns {string} Teks menu bantuan yang sudah diformat.
     */
    formatHelpMenu: (commands) => {
        let helpText = '*🤖 MENU BANTUAN BOT 🤖*\n\n';
        helpText += 'Berikut adalah daftar perintah yang tersedia:\n\n';
        const categories = {};
        
        commands.forEach(cmd => {
            const category = cmd.category || 'Lainnya';
            if(!categories[category]) categories[category] = [];
            categories[category].push(cmd);
        });

        for (const category in categories) {
            helpText += `*📁 ${category.charAt(0).toUpperCase() + category.slice(1)}*\n`;
            categories[category].forEach(cmd => {
                helpText += `  ◦ *!${cmd.name}*: ${cmd.description}\n`;
            });
            helpText += '\n';
        }
        
        helpText += `_Ketik !<perintah> untuk menggunakan._`;
        return helpText;
    },

    /**
     * Membuat format pengumuman meja Roulette baru.
     * @param {object} session - Objek sesi game dari gameManager.
     * @param {string} hostId - JID dari pemain yang memulai game.
     * @returns {string} Teks pengumuman yang sudah diformat.
     */
    formatRouletteTableOpen: (session, hostId) => {
        let output = "🎲 ─── MEJA ROULETTE DIBUKA! ───\n\n";
        output += `👤 Host: @${hostId.split('@')[0]}\n`;
        output += `🎩 Bandar malam ini: ${session.dealer}\n\n`;
        output += "🎰 Silakan pasang taruhanmu!\n";
        output += "Ketik:\n";
        output += "→ `!roulette bet warna merah 50`\n";
        output += "→ `!roulette bet paritas ganjil 100`\n";
        output += "→ `!roulette bet angka 17 25`\n";
        output += "→ `!roulette bet range rendah 75`\n";
        output += "→ Atau kombinasi sekaligus:\n";
        output += "   `!roulette bet merah ganjil 1-18 50`\n\n";
        output += `🕹️ Host, ketik *!roulette spin* untuk memutar roda setelah semua siap!`;
        return output;
    },

    /**
     * Membuat format hasil putaran Roulette.
     * @param {object} session - Objek sesi game.
     * @param {number} winningNumber - Angka kemenangan.
     * @param {object} numberInfo - Informasi tentang angka kemenangan (warna, paritas, range).
     * @param {object} playerResults - Hasil dari setiap pemain.
     * @returns {{text: string, mentions: string[]}} Objek berisi teks hasil dan daftar mention.
     */
    formatRouletteSpinResult: (session, winningNumber, numberInfo, playerResults) => {
        let output = "🎰 ──── HASIL ROULETTE ────\n\n";
        output += `🎯 Roda berhenti di: *${winningNumber} ${numberInfo.color.toUpperCase()}*\n`;
        const parityText = numberInfo.parity === 'netral' ? 'NETRAL' : (numberInfo.parity === 'ganjil' ? 'GANJIL' : 'GENAP');
        output += `⚫️ ${parityText} — ⬆️ ${numberInfo.range.toUpperCase()}\n\n`;
        output += "──────────────────────\n\n";
        output += "🏆 HASIL PEMAIN:\n";
        
        const mentions = [];
        if (Object.keys(playerResults).length > 0) {
            for (const pId in playerResults) {
                mentions.push(pId);
                const result = playerResults[pId];
                if (result.winnings > 0) {
                    output += `🎉 @${pId.split('@')[0]} menang total *${result.winnings.toLocaleString()}* Yuki!\n`;
                } else {
                    output += `😥 @${pId.split('@')[0]} kalah total *${result.totalBet.toLocaleString()}* Yuki.\n`;
                }
            }
        } else {
            output += "Tidak ada yang bertaruh di putaran ini.\n";
        }
        
        output += "\n──────────────────────\n\n";
        output += `🎲 Roda telah diputar! Sampai jumpa di ronde selanjutnya!\n`;
        output += `*${session.dealer}*: "Keberuntungan ada di pihak yang berani."`;

        return { text: output, mentions };
    },

    /**
     * Membuat format statistik game Suit.
     * @param {object} stats - Objek statistik pemain.
     * @param {string} userName - Nama pemain.
     * @returns {string} Teks statistik yang sudah diformat.
     */
    formatSuitStats: (stats, userName) => {
        if (!stats || stats.plays === 0) return `Belum ada data statistik Suit untuk @${userName}.`;
        const winrate = (stats.wins / stats.plays) * 100;
        let output = `📊 *Statistik Suit @${userName}*:\n\n`;
        output += `- Total Main: *${stats.plays}x*\n`;
        output += `- Menang: *${stats.wins}x*\n`;
        output += `- Kalah: *${stats.plays - stats.wins}x*\n`;
        output += `- Winrate: *${winrate.toFixed(1)}%*`;
        return output;
    },

    /**
     * Membuat format histori 5 pertandingan terakhir Suit.
     * @param {Array<object>} history - Array histori pertandingan.
     * @param {string} userName - Nama pemain.
     * @returns {string} Teks histori yang sudah diformat.
     */
    formatSuitHistory: (history, userName) => {
        if (history.length === 0) return `Belum ada histori pertandingan untuk @${userName}.`;
        let output = `📜 *5 Pertandingan Terakhir @${userName}*:\n\n`;
        history.forEach(match => {
            const icon = match.result === 'win' ? '✅' : '❌';
            const opponentName = match.opponent.split('@')[0];
            output += `${icon} vs *@${opponentName}*\n`;
        });
        return output;
    }
};

export default ui;