const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));
app.use('/Css', express.static(path.join(__dirname, 'Css')));
app.use('/Js', express.static(path.join(__dirname, 'Js')));

const PORT = process.env.PORT || 3000;
const rooms = {};

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
}

io.on('connection', (socket) => {
    console.log('Гравець підключився:', socket.id);

    // Створення кімнати
    socket.on('createRoom', () => {
        const roomCode = generateRoomCode();
        rooms[roomCode] = { 
            players: [socket.id], 
            grids: {}, 
            hits: {} 
        };
        rooms[roomCode].hits[socket.id] = 0;
        socket.join(roomCode);
        socket.emit('roomCreated', roomCode);
    });

    // Приєднання до кімнати
    socket.on('joinRoom', (roomCode) => {
        roomCode = roomCode.toUpperCase();
        if (rooms[roomCode] && rooms[roomCode].players.length < 2) {
            rooms[roomCode].players.push(socket.id);
            rooms[roomCode].hits[socket.id] = 0;
            socket.join(roomCode);
            socket.emit('joinSuccess', roomCode);
            io.to(roomCode).emit('startGame'); // Перехід до розстановки
        } else {
            socket.emit('joinError', 'Кімнату не знайдено або вона повна!');
        }
    });

    // Коли гравець розставив кораблі і натиснув "ГОТОВИЙ"
    socket.on('playerReady', (grid) => {
        const roomCode = Array.from(socket.rooms).find(r => r !== socket.id);
        if (!roomCode || !rooms[roomCode]) return;

        const room = rooms[roomCode];
        room.grids[socket.id] = grid;

        // Якщо обидва готові — починаємо бій
        if (Object.keys(room.grids).length === 2) {
            room.turn = room.players[0]; // Першим ходить той, хто створив кімнату
            io.to(roomCode).emit('matchStarted', room.turn);
        } else {
            socket.emit('waitingForOpponent');
        }
    });

    // Обробка пострілу
    socket.on('fire', ({ x, y }) => {
        const roomCode = Array.from(socket.rooms).find(r => r !== socket.id);
        if (!roomCode || !rooms[roomCode]) return;

        const room = rooms[roomCode];
        if (room.turn !== socket.id) return; // Перевірка, чи зараз хід цього гравця

        const opponentId = room.players.find(id => id !== socket.id);
        const opponentGrid = room.grids[opponentId];

        let result = 'miss';
        if (opponentGrid[y][x] === 1) {
            result = 'hit';
            opponentGrid[y][x] = 3; // Відмічаємо попадання на сервері
            room.hits[socket.id]++;
        } else {
            opponentGrid[y][x] = 2; // Відмічаємо промах
            room.turn = opponentId; // Передаємо хід іншому гравцю
        }

        const isWin = room.hits[socket.id] === 20; // 20 палуб = перемога

        // Відправляємо результат обом гравцям
        io.to(roomCode).emit('fireResult', {
            x, y, result,
            shooter: socket.id,
            nextTurn: room.turn,
            isWin
        });
    });

    socket.on('disconnect', () => {
        console.log('Гравець відключився:', socket.id);
        // Сповіщаємо іншого гравця, якщо його опонент вийшов
        for (const roomCode in rooms) {
            if (rooms[roomCode].players.includes(socket.id)) {
                io.to(roomCode).emit('opponentDisconnected');
                delete rooms[roomCode];
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Сервер запущено на http://localhost:${PORT}`);
});