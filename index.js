// index.js

// --- AWAL BAGIAN YANG DIPERBAIKI ---
import baileys from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal'; // <-- Tambahkan import ini
import { Boom } from '@hapi/boom';
import pino from 'pino';
// --- AKHIR BAGIAN YANG DIPERBAIKI ---

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = baileys;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commands = new Map();

async function loadCommands() {
    const commandFolders = fs.readdirSync(path.join(__dirname, 'commands'));
    for (const folder of commandFolders) {
        const commandFiles = fs.readdirSync(path.join(__dirname, `commands/${folder}`)).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            try {
                const commandModule = await import(`./commands/${folder}/${file}`);
                const command = commandModule.default;
                if (command && command.name) {
                    commands.set(command.name, command);
                    console.log(`✅ Perintah dimuat: ${command.name}`);
                }
            } catch (error) {
                console.error(`❌ Gagal memuat perintah dari ${file}:`, error);
            }
        }
    }
}

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        // printQRInTerminal: true, // <-- Hapus atau komentari baris ini
        auth: state,
    });

    await loadCommands();

    sock.ev.on('creds.update', saveCreds);

    // --- AWAL BAGIAN YANG DIPERBAIKI ---
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update; // <-- Ambil 'qr' dari update

        if(qr) {
            // Jika ada QR code, tampilkan di terminal
            console.log('Silakan scan QR Code di bawah ini:')
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom) && lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut;
            console.log('Koneksi terputus: ', lastDisconnect.error, ', reconnect:', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('✅ BOT BERHASIL TERHUBUNG!');
        }
    });
    // --- AKHIR BAGIAN YANG DIPERBAIKI ---


    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const messageType = Object.keys(msg.message)[0];
        const messageText = messageType === 'conversation' ? msg.message.conversation :
                            messageType === 'extendedTextMessage' ? msg.message.extendedTextMessage.text : '';

        const prefix = '!';
        if (!messageText || !messageText.startsWith(prefix)) return;

        const args = messageText.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const command = commands.get(commandName) || Array.from(commands.values()).find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

        if (!command) return;
        
        const sender = msg.key.remoteJid.endsWith('@g.us') ? msg.key.participant : msg.key.remoteJid;
        console.log(`[EKSEKUSI] Perintah: ${commandName}, User: ${sender}`);

        try {
            await command.execute({ sock, m: msg, args, commands });
        } catch (error) {
            console.error(`Error pada perintah ${commandName}:`, error);
            await sock.sendMessage(msg.key.remoteJid, { text: 'Maaf, terjadi kesalahan.' }, { quoted: msg });
        }
    });
}

connectToWhatsApp();