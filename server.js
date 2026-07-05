const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

let historicoVendas = [];
let usuariosOnline = {}; 

app.use(express.static(__dirname));

// Rotas para garantir que acessem os arquivos
app.get('/painel', (req, res) => { res.sendFile(path.join(__dirname, 'painel.html')); });
app.get('/cliente', (req, res) => { res.sendFile(path.join(__dirname, 'cliente.html')); });

io.on('connection', (socket) => {
    socket.on('registrarCliente', (telefone) => {
        usuariosOnline[telefone] = socket.id;
        console.log(`Telefone ${telefone} conectado ao socket ${socket.id}`);
        const venda = historicoVendas.find(v => v.telefone === telefone);
        if (venda) socket.emit('minhasCartelas', venda.cartelas);
    });

    socket.on('registrarVenda', (dados) => {
        historicoVendas.push(dados);
        if (usuariosOnline[dados.telefone]) {
            io.to(usuariosOnline[dados.telefone]).emit('minhasCartelas', dados.cartelas);
            console.log(`Sucesso: Enviado para ${dados.telefone}`);
        } else {
            console.log(`Aviso: Cliente ${dados.telefone} não está conectado.`);
        }
        io.emit('atualizarRelatorio', historicoVendas);
    });

    socket.on('reiniciarPainel', () => { 
        historicoVendas = []; 
        usuariosOnline = {}; 
        io.emit('reiniciar'); 
        io.emit('atualizarRelatorio', []); 
    });

    socket.on('numeroSorteado', (num) => { io.emit('novoNumero', num); });
});

http.listen(3000, () => console.log('Servidor rodando em http://localhost:3000'));
