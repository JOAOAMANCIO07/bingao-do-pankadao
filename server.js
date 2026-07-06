const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

let sorteados = [];
let clientes = {};

io.on('connection', (socket) => {
    console.log(`Nova conexão: ${socket.id}`);

    socket.on('registrarCliente', (tel) => {
        clientes[tel] = socket.id;
        console.log(`Cliente registrado: ${tel}`);
        socket.emit('historicoSorteios', sorteados);
    });

    socket.on('enviarCartela', (dados) => {
        const { tel, cartelas } = dados;
        const socketId = clientes[tel];
        if (socketId) {
            io.to(socketId).emit('minhasCartelas', cartelas);
            console.log(`Cartelas enviadas para o cliente ${tel}`);
        } else {
            console.log(`Aviso: Cliente ${tel} não está conectado.`);
        }
    });

    socket.on('sortearNumero', (num) => {
        if (!sorteados.includes(num)) {
            sorteados.push(num);
            io.emit('novoNumero', num);
        }
    });

    socket.on('reiniciarJogo', () => {
        sorteados = [];
        io.emit('reiniciar');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor do Bingão rodando na porta ${PORT}`);
});
