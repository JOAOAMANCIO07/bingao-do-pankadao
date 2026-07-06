// Versao 2.0 - Atualizacao Forcada do Bingao
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();

// Ativa o CORS para permitir conexões externas
app.use(cors({
    origin: "*",
    methods: ["GET", "POST"]
}));

// Serve as páginas HTML direto da pasta principal
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
let listaVendas = []; // Guarda o histórico para o relatório

io.on('connection', (socket) => {
    console.log(`Nova conexão estabelecida: ${socket.id}`);

    // Envia o relatório assim que o painel conecta
    socket.emit('atualizarRelatorio', listaVendas);

    // Quando o cliente envia o telefone para conectar
    socket.on('registrarCliente', (tel) => {
        clientes[tel] = socket.id;
        console.log(`Cliente registrado com o telefone: ${tel}`);
        socket.emit('historicoSorteios', sorteados);
    });

    // Quando o painel envia as cartelas
    socket.on('enviarCartela', (dados) => {
        const { nome, tel, cartelas } = dados;
        
        // Salva no relatório do painel
        listaVendas.push({ nome, telefone: tel, qtd: cartelas.length, cartelas });
        
        // Atualiza a tabela em todos os painéis abertos
        io.emit('atualizarRelatorio', listaVendas);

        // Entrega as cartelas para o cliente se ele estiver online
        const socketId = clientes[tel];
        if (socketId) {
            io.to(socketId).emit('minhasCartelas', cartelas);
            console.log(`Cartelas enviadas com sucesso para o cliente ${tel}`);
        } else {
            console.log(`Aviso: Cliente ${tel} não está online agora, mas a venda foi salva no relatório.`);
        }
    });

    // Sorteio de pedras
    socket.on('sortearNumero', (num) => {
        if (!sorteados.includes(num)) {
            sorteados.push(num);
            io.emit('novoNumero', num);
        }
    });

    // Reiniciar a rodada
    socket.on('reiniciarJogo', () => {
        sorteados = [];
        listaVendas = [];
        io.emit('atualizarRelatorio', listaVendas);
        io.emit('reiniciar');
        console.log("O jogo foi reiniciado!");
    });
});

// Porta padrão do Render
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor do Bingão rodando com sucesso na porta ${PORT}`);
});
