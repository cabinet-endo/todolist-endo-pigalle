const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));

// In-memory storage for tasks
let tasks = [];

wss.on('connection', (ws) => {
    console.log('New client connected');

    // Send all existing tasks to the new client
    ws.send(JSON.stringify({ type: 'init', tasks: tasks }));

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'newTask':
                tasks.push(data.task);
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

        // Broadcast the update to all clients
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'update', tasks: tasks }));
            }
        });
    });
});

// Serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});