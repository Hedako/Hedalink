import express from 'express';
import { randomTask } from './random.js';
import makeWASocket, { useSingleFileAuthState } from '@adiwajshing/baileys';
import { Boom } from '@hapi/boom';
import { unlinkSync } from 'fs';

const { state, saveState } = useSingleFileAuthState('./sessions/session.json');
const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json());

app.post('/lock', (req, res) => {
    const { userTask, lockedLink } = req.body;
    const randomGeneratedTask = randomTask();
    res.json({ userTask, randomTask: randomGeneratedTask, lockedLink });
});

// Pairing WhatsApp with Baileys
async function connectToWhatsApp() {
    const socket = makeWASocket({
        auth: state,
        printQRInTerminal: true
    });

    socket.ev.on('creds.update', saveState);

    socket.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                connectToWhatsApp();
            } else {
                unlinkSync('./sessions/session.json');
            }
        } else if (connection === 'open') {
            console.log('WhatsApp connection opened');
        }
    });
}

connectToWhatsApp().catch(console.error);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
