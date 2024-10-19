let socket;
let tasks = [];
let predefinedTasks = {};
let lastKnownTaskCount = 0;
let isDashboard = false;
let currentUser = '';

function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${protocol}//${window.location.host}`);

    socket.onopen = () => {
        console.log('Connected to WebSocket server');
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'init' || data.type === 'update') {
            const newTasks = data.tasks.filter(task => !task.done);
            const oldTaskCount = lastKnownTaskCount;
            lastKnownTaskCount = newTasks.length;

            tasks = data.tasks;
            updateDashboard();
            updateArchivedTasks();

            if (isDashboard && newTasks.length > oldTaskCount) {
                const newestTask = newTasks[newTasks.length - 1];
                playSound(newestTask.sound);
            }
        }
    };

    socket.onclose = () => {
        console.log('Disconnected from WebSocket server');
        setTimeout(connectWebSocket, 5000);
    };
}

function createTask(title, recipient, sound, urgency, sender, predefined = false) {
    const task = {
        id: Date.now(),
        title,
        recipient,
        sound,
        urgency,
        sender,
        timestamp: new Date().toLocaleString(),
        done: false,
        predefined
    };
    socket.send(JSON.stringify({ type: 'newTask', task: task }));
}

function completeTask(taskId) {
    socket.send(JSON.stringify({ type: 'completeTask', taskId: taskId }));
}

function deleteArchivedTask(taskId) {
    socket.send(JSON.stringify({ type: 'deleteTask', taskId: taskId }));
}

function updateDashboard() {
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
        dashboard.innerHTML = '';
        const activeTasks = tasks.filter(t => !t.done);
        activeTasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = `task ${task.urgency}`;
            taskElement.innerHTML = `
                <p>${task.title}</p>
                <p>De: ${task.sender}</p>
                <p>Pour: ${task.recipient}</p>
                <p>Heure: ${task.timestamp}</p>
                <button onclick="completeTask(${task.id})">Terminé</button>
            `;
            dashboard.appendChild(taskElement);
        });
    }
}

function updateArchivedTasks() {
    const archivedTasksList = document.getElementById('archivedTasks');
    if (archivedTasksList) {
        archivedTasksList.innerHTML = '';
        const archivedTasks = tasks.filter(t => t.done);
        archivedTasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'task';
            taskElement.innerHTML = `
                <p>${task.title}</p>
                <p>De: ${task.sender}</p>
                <p>Pour: ${task.recipient}</p>
                <p>Heure: ${task.timestamp}</p>
                <button onclick="deleteArchivedTask(${task.id})">Supprimer</button>
            `;
            archivedTasksList.appendChild(taskElement);
        });
    }
}

function playSound(soundName) {
    if (isDashboard) {
        const audio = new Audio(`sounds/${soundName}.mp3`);
        audio.play().catch(e => console.error('Error playing sound:', e));
    }
}

function isValidRecipient(recipient) {
    const validRecipients = ['Arnaud', 'Julien', 'Assistante', 'Anne'];
    return validRecipients.includes(recipient);
}

function savePredefinedTasks() {
    localStorage.setItem(`predefinedTasks_${currentUser}`, JSON.stringify(predefinedTasks[currentUser]));
}

function loadPredefinedTasks() {
    predefinedTasks[currentUser] = JSON.parse(localStorage.getItem(`predefinedTasks_${currentUser}`)) || {};
}

function createPredefinedTask(sender, title, recipient, sound, urgency) {
    const id = Date.now();
    if (!predefinedTasks[sender]) {
        predefinedTasks[sender] = {};
    }
    predefinedTasks[sender][id] = { title, recipient, sound, urgency };
    savePredefinedTasks();
    updatePredefinedTasksList(sender);
}

function updatePredefinedTask(sender, id, title, recipient, sound, urgency) {
    predefinedTasks[sender][id] = { title, recipient, sound, urgency };
    savePredefinedTasks();
    updatePredefinedTasksList(sender);
}

function deletePredefinedTask(sender, id) {
    delete predefinedTasks[sender][id];
    savePredefinedTasks();
    updatePredefinedTasksList(sender);
}

function updatePredefinedTasksList(sender) {
    const predefinedTasksList = document.getElementById('predefinedTasks');
    if (predefinedTasksList) {
        predefinedTasksList.innerHTML = '';
        Object.entries(predefinedTasks[sender] || {}).forEach(([id, task]) => {
            const taskElement = document.createElement('div');
            taskElement.className = 'predefined-task';
            taskElement.innerHTML = `
                <p>${task.title}</p>
                <p>Pour: ${task.recipient}</p>
                <p>Urgence: ${task.urgency}</p>
                <p>Son: ${task.sound}</p>
                <button onclick="createTask('${task.title}', '${task.recipient}', '${task.sound}', '${task.urgency}', '${sender}', true)">Envoyer</button>
                <button onclick="showEditForm('${id}', '${task.title}', '${task.recipient}', '${task.sound}', '${task.urgency}')">Modifier</button>
                <button onclick="deletePredefinedTask('${sender}', '${id}')">Supprimer</button>
            `;
            predefinedTasksList.appendChild(taskElement);
        });
    }
}

function showEditForm(id, title, recipient, sound, urgency) {
    const editForm = document.getElementById('editPredefinedTaskForm');
    editForm.innerHTML = `
        <input type="hidden" id="editTaskId" value="${id}">
        <input type="text" id="editTaskTitle" value="${title}" required>
        <select id="editTaskRecipient" required>
            <option value="Arnaud" ${recipient === 'Arnaud' ? 'selected' : ''}>Arnaud</option>
            <option value="Julien" ${recipient === 'Julien' ? 'selected' : ''}>Julien</option>
            <option value="Assistante" ${recipient === 'Assistante' ? 'selected' : ''}>Assistante</option>
            <option value="Anne" ${recipient === 'Anne' ? 'selected' : ''}>Anne</option>
        </select>
        <select id="editTaskSound" required>
            <option value="notification1" ${sound === 'notification1' ? 'selected' : ''}>Notification 1</option>
            <option value="notification2" ${sound === 'notification2' ? 'selected' : ''}>Notification 2</option>
            <option value="notification3" ${sound === 'notification3' ? 'selected' : ''}>Notification 3</option>
        </select>
        <select id="editTaskUrgency" required>
            <option value="normal" ${urgency === 'normal' ? 'selected' : ''}>Normal</option>
            <option value="urgent" ${urgency === 'urgent' ? 'selected' : ''}>Urgent</option>
        </select>
        <button type="submit">Modifier</button>
    `;
    editForm.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {
    connectWebSocket();
    currentUser = document.body.dataset.sender;
    if (currentUser) {
        loadPredefinedTasks();
        updatePredefinedTasksList(currentUser);
    }
    isDashboard = window.location.pathname.endsWith('tableau_de_bord.html');
});