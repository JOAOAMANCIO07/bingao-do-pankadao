const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();

// Ativa o CORS para permitir que o Painel e o Cliente se conectem de qualquer lugar
app.use(cors({
    origin: "*",
    methods: ["GET", "POST"]
}));

// Serve as páginas HTML (cliente.html, painel.html) direto da pasta principal
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
let listaVendas = []; // Lista na memória que vai guardar o relatório de vendas

io.on('connection', (socket) => {
    console.log(`Nova conexão estabelecida: ${socket.id}`);

    // Assim que o painel se conecta, ele recebe o relatório de vendas atualizado
    socket.emit('atualizarRelatorio', listaVendas);

    // Quando o cliente digita o telefone e se conecta
    socket.on('registrarCliente', (tel) => {
        clientes[tel] = socket.id;
        console.log(`Cliente registrado com o telefone: ${tel}`);
        // Envia os números que já foram sorteados para o cliente não ficar desatualizado
        socket.emit('historicoSorteios', sorteados);
    });

    // Quando o painel envia as cartelas geradas
    socket.on('enviarCartela', (dados) => {
        const { nome, tel, cartelas } = dados;
        
        // 1. Salva a venda na lista do relatório
        listaVendas.push({ nome, telefone: tel, qtd: cartelas.length, cartelas });
        
        // 2. Avisa o painel para atualizar a tabela de relatórios na tela
        io.emit('atualizarRelatorio', listaVendas);

        // 3. Envia as cartelas direto para o celular/tela do cliente se ele estiver online
        const socketId = clientes[tel];
        if (socketId) {
            io.to(socketId).emit('minhasCartelas', cartelas);
            console.log(`Cartelas enviadas com sucesso para o cliente ${tel}`);
        } else {
            console.log(`Aviso: Cliente ${tel} não está online agora, mas a venda foi salva no relatório.`);
        }
    });

    // Quando o painel sorteia uma pedra
    socket.on('sortearNumero', (num) => {
        if (!sorteados.includes(num)) {
            sorteados.push(num);
            io.emit('novoNumero', num);
        }
    });

    // Quando clica em reiniciar o jogo
    socket.on('reiniciarJogo', () => {
        sorteados = [];
        listaVendas = []; // Zera o relatório de vendas para um novo jogo
        io.emit('atualizarRelatorio', listaVendas);
        io.emit('reiniciar');
        console.log("O jogo foi reiniciado!");
    });
});

// Configuração da porta obrigatória para o Render funcionar (0.0.0.0)
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor do Bingão rodando com sucesso na porta ${PORT}`);
});
