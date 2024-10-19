const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Servir les fichiers statiques depuis le dossier 'public'
app.use(express.static(path.join(__dirname, '../public')));

// Stocker les tâches en mémoire (à remplacer par une base de données pour la production)
let tasks = [];

wss.on('connection', (ws) => {
    console.log('Nouveau client connecté');

    // Envoyer toutes les tâches existantes au nouveau client
    ws.send(JSON.stringify({ type: 'init', tasks: tasks }));

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'newTask':
                if (isValidRecipient(data.task.recipient)) {
                    tasks.push(data.task);
                } else {
                    console.error('Destinataire invalide:', data.task.recipient);
                }
                break;
            case 'completeTask':
                const taskIndex = tasks.findIndex(t => t.id === data.taskId);
                if (taskIndex !== -1) {
                    tasks[taskIndex].done = true;
                }
                break;
            case 'deleteTask':
                tasks = tasks.filter(t => t.id !== data.taskId);
                break;
        }

        // Diffuser la mise à jour à tous les clients
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'update', tasks: tasks }));
            }
        });
    });
});

function isValidRecipient(recipient) {
    const validRecipients = ['Arnaud', 'Julien', 'Assistante', 'Anne'];
    return validRecipients.includes(recipient);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
});