// Versao 3.0 - Busca Automatica de Cartelas por Telefone
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

let sorteados = [];
let clientes = {};
let listaVendas = [];

io.on('connection', (socket) => {
    console.log(`Nova conexão: ${socket.id}`);
    socket.emit('atualizarRelatorio', listaVendas);

    socket.on('registrarCliente', (tel) => {
        clientes[tel] = socket.id;
        console.log(`Cliente conectado: ${tel}`);
        
        // BUSCA AUTOMÁTICA: Se o cliente conectar, o servidor já varre o relatório
        // e entrega as cartelas dele na hora, mesmo se a venda foi feita antes!
        const vendaEncontrada = listaVendas.find(v => v.telefone === tel);
        if (vendaEncontrada) {
            socket.emit('minhasCartelas', vendaEncontrada.cartelas);
            console.log(`Cartelas antigas recuperadas e enviadas para ${tel}`);
        }
        
        socket.emit('historicoSorteios', sorteados);
    });

    socket.on('enviarCartela', (dados) => {
        const { nome, tel, cartelas } = dados;
        
        listaVendas.push({ nome, telefone: tel, qtd: cartelas.length, cartelas });
        io.emit('atualizarRelatorio', listaVendas);

        const socketId = clientes[tel];
        if (socketId) {
            io.to(socketId).emit('minhasCartelas', cartelas);
            console.log(`Cartelas entregues ao vivo para ${tel}`);
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
        listaVendas = [];
        io.emit('atualizarRelatorio', listaVendas);
        io.emit('reiniciar');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
