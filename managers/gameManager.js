// managers/gameManager.js

const activeSessions = new Map();

const gameManager = {
    // Membuat sesi baru, mencegah game bentrok di grup yang sama
    createSession: (groupId, gameName, initialData = {}) => {
        if (activeSessions.has(groupId)) {
            return { success: false, message: `Masih ada permainan ${activeSessions.get(groupId).gameName} yang sedang berlangsung di grup ini.` };
        }
        activeSessions.set(groupId, { gameName, ...initialData });
        return { success: true, message: `Sesi ${gameName} berhasil dibuat.` };
    },

    // Mendapatkan data sesi game yang aktif
    getSession: (groupId) => {
        return activeSessions.get(groupId);
    },

    // Memperbarui data sesi
    updateSession: (groupId, newData) => {
        if (!activeSessions.has(groupId)) {
            return false;
        }
        const currentSession = activeSessions.get(groupId);
        activeSessions.set(groupId, { ...currentSession, ...newData });
        return true;
    },

    // Menutup sesi game
    closeSession: (groupId) => {
        if (activeSessions.has(groupId)) {
            activeSessions.delete(groupId);
            return true;
        }
        return false;
    }
};

export default gameManager;