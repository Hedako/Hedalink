import fs from 'fs';
import path from 'path';

// Fonction utilitaire pour créer des fichiers avec leur contenu
function createFile(filePath, content) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
}

// 1. Création du fichier index.html
const indexHtmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Link Lock</title>
</head>
<body>
    <h1>Lock Your Link</h1>
    <form id="lockForm">
        <label for="userTask">Your Task:</label>
        <input type="text" id="userTask" placeholder="Enter your task (e.g., subscribe link)" required><br><br>

        <label for="lockedLink">Link to Lock:</label>
        <input type="text" id="lockedLink" placeholder="Enter the link you want to lock" required><br><br>

        <button type="submit">Lock Link</button>
    </form>

    <div id="lockedMessage" style="display:none;">
        <h2>Your Link is Locked</h2>
        <p>Complete the following tasks to unlock:</p>
        <ul id="tasks"></ul>
    </div>

    <script src="/js/main.js"></script>
</body>
</html>`;
createFile('public/index.html', indexHtmlContent);

// 2. Création du fichier style.css
const styleCssContent = `body {
    font-family: Arial, sans-serif;
    background-color: #f4f4f4;
    margin: 0;
    padding: 0;
}

h1 {
    text-align: center;
    color: #333;
}

form {
    width: 50%;
    margin: auto;
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

input, button {
    width: 100%;
    padding: 10px;
    margin-top: 10px;
}

button {
    background-color: #007BFF;
    color: white;
    border: none;
    cursor: pointer;
}

button:hover {
    background-color: #0056b3;
}`;
createFile('public/style.css', styleCssContent);

// 3. Création du fichier main.js
const mainJsContent = `document.getElementById('lockForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const userTask = document.getElementById('userTask').value;
    const lockedLink = document.getElementById('lockedLink').value;
    
    const response = await fetch('/lock', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userTask, lockedLink })
    });
    const data = await response.json();
    
    document.getElementById('tasks').innerHTML = \`
        <li>\${data.userTask}</li>
        <li>\${data.randomTask}</li>
    \`;
    document.getElementById('lockForm').style.display = 'none';
    document.getElementById('lockedMessage').style.display = 'block';
});`;
createFile('public/js/main.js', mainJsContent);

// 4. Création du fichier random.js
const randomJsContent = `export function randomTask() {
    const tasks = [
        'Watch this video',
        'Like this post',
        'Share this page',
        'Follow on Instagram',
        'Join the Telegram group'
    ];
    const randomIndex = Math.floor(Math.random() * tasks.length);
    return tasks[randomIndex];
}`;
createFile('utils/random.js', randomJsContent);

// 5. Création du fichier whatsappController.js
const whatsappControllerJsContent = `import makeWASocket, { useSingleFileAuthState } from '@adiwajshing/baileys';
import { Boom } from '@hapi/boom';
import { unlinkSync } from 'fs';

const { state, saveState } = useSingleFileAuthState('./sessions/whatsapp-session.json');

export function manageWhatsApp() {
    const connectToWhatsApp = async () => {
        const socket = makeWASocket({
            auth: state,
            printQRInTerminal: true
        });

        socket.ev.on('creds.update', saveState);

        socket.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect.error as Boom)?.output?.statusCode !== 401;
                if (shouldReconnect) {
                    connectToWhatsApp();
                } else {
                    unlinkSync('./sessions/whatsapp-session.json');
                }
            } else if (connection === 'open') {
                console.log('WhatsApp connection opened');
            }
        });
    };

    connectToWhatsApp().catch(console.error);
}`;
createFile('controllers/whatsappController.js', whatsappControllerJsContent);

// 6. Création du fichier server.js
const serverJsContent = `import express from 'express';
import bodyParser from 'body-parser';
import { randomTask } from './utils/random.js';
import { manageWhatsApp } from './controllers/whatsappController.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

const sessionsDir = path.join(__dirname, 'sessions');
const usersDir = path.join(__dirname, 'users');

if (!fs.existsSync(usersDir)) {
    fs.mkdirSync(usersDir);
}

app.post('/start-session', (req, res) => {
    const userID = uuidv4();
    const userDir = path.join(usersDir, userID);

    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir);
        fs.writeFileSync(path.join(userDir, 'links.json'), JSON.stringify([]));
        fs.writeFileSync(path.join(userDir, 'stats.json'), JSON.stringify({ clicks: 0 }));
    }

    res.json({ userID });
});

app.post('/lock-link', (req, res) => {
    const { userID, userTask, lockedLink } = req.body;
    const randomGeneratedTask = randomTask();
    const userDir = path.join(usersDir, userID);
    const linksPath = path.join(userDir, 'links.json');

    const links = JSON.parse(fs.readFileSync(linksPath));
    links.push({ lockedLink, userTask, randomTask: randomGeneratedTask });
    fs.writeFileSync(linksPath, JSON.stringify(links));

    res.json({ userTask, randomTask: randomGeneratedTask, lockedLink });
});

app.post('/click', (req, res) => {
    const { userID, linkID } = req.body;
    const userDir = path.join(usersDir, userID);
    const statsPath = path.join(userDir, 'stats.json');

    const stats = JSON.parse(fs.readFileSync(statsPath));
    stats.clicks += 1;
    fs.writeFileSync(statsPath, JSON.stringify(stats));

    res.json({ clicks: stats.clicks });
});

manageWhatsApp();

app.listen(PORT, () => {
    console.log(\`Server is running on http://localhost:\${PORT}\`);
});`;
createFile('server.js', serverJsContent);

// 7. Création du fichier .env
const envContent = `PORT=3000`;
createFile('.env', envContent);

// 8. Création du fichier package.json
const packageJsonContent = `{
  "name": "link-lock-project",
  "version": "1.0.0",
  "description": "A link lock system using WhatsApp and random tasks.",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "@adiwajshing/baileys": "^4.4.0",
    "@hapi/boom": "^9.1.4",
    "express": "^4.18.2",
    "dotenv": "^10.0.0",
    "uuid": "^8.3.2",
    "body-parser": "^1.19.0"
  },
  "author": "Pixels De Nganos",
  "license": "ISC"
}`;
createFile('package.json', packageJsonContent);

console.log('Project files and structure generated successfully.');
