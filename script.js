const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, '../data/trades.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

// Rotas da API
// GET /api/trades - Listar todas as operações
app.get('/api/trades', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const trades = JSON.parse(data);
        res.json(trades);
    } catch (error) {
        console.error('Erro ao ler trades:', error);
        res.status(500).json({ error: 'Erro ao carregar operações' });
    }
});

// POST /api/trades - Criar nova operação
app.post('/api/trades', async (req, res) => {
    try {
        const newTrade = req.body;
        newTrade.id = Date.now().toString();
        newTrade.createdAt = new Date().toISOString();
        
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const trades = JSON.parse(data);
        
        trades.push(newTrade);
        
        await fs.writeFile(DATA_FILE, JSON.stringify(trades, null, 2));
        res.status(201).json(newTrade);
    } catch (error) {
        console.error('Erro ao salvar trade:', error);
        res.status(500).json({ error: 'Erro ao salvar operação' });
    }
});

// PUT /api/trades/:id - Atualizar operação
app.put('/api/trades/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updatedTrade = req.body;
        
        const data = await fs.readFile(DATA_FILE, 'utf8');
        let trades = JSON.parse(data);
        
        const index = trades.findIndex(t => t.id === id);
        if (index === -1) {
            return res.status(404).json({ error: 'Operação não encontrada' });
        }
        
        trades[index] = { ...trades[index], ...updatedTrade };
        
        await fs.writeFile(DATA_FILE, JSON.stringify(trades, null, 2));
        res.json(trades[index]);
    } catch (error) {
        console.error('Erro ao atualizar trade:', error);
        res.status(500).json({ error: 'Erro ao atualizar operação' });
    }
});

// DELETE /api/trades/:id - Excluir operação
app.delete('/api/trades/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const data = await fs.readFile(DATA_FILE, 'utf8');
        let trades = JSON.parse(data);
        
        const filteredTrades = trades.filter(t => t.id !== id);
        
        await fs.writeFile(DATA_FILE, JSON.stringify(filteredTrades, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir trade:', error);
        res.status(500).json({ error: 'Erro ao excluir operação' });
    }
});

// GET /api/metrics - Obter métricas
app.get('/api/metrics', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const trades = JSON.parse(data);
        
        // Cálculo básico de métricas
        const totalTrades = trades.length;
        const winTrades = trades.filter(t => t.status === 'win').length;
        const lossTrades = totalTrades - winTrades;
        const winRate = totalTrades > 0 ? ((winTrades / totalTrades) * 100).toFixed(1) : 0;
        const totalPl = trades.reduce((sum, t) => sum + (t.result || 0), 0);
        
        res.json({
            totalTrades,
            winTrades,
            lossTrades,
            winRate,
            totalPl,
            avgWin: winTrades > 0 ? trades.filter(t => t.status === 'win').reduce((sum, t) => sum + t.result, 0) / winTrades : 0,
            avgLoss: lossTrades > 0 ? trades.filter(t => t.status === 'loss').reduce((sum, t) => sum + t.result, 0) / lossTrades : 0
        });
    } catch (error) {
        console.error('Erro ao calcular métricas:', error);
        res.status(500).json({ error: 'Erro ao calcular métricas' });
    }
});

// GET /api/export - Exportar dados
app.get('/api/export', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const trades = JSON.parse(data);
        
        res.setHeader('Content-Disposition', 'attachment; filename=trades-backup.json');
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(trades, null, 2));
    } catch (error) {
        console.error('Erro ao exportar dados:', error);
        res.status(500).json({ error: 'Erro ao exportar dados' });
    }
});

// POST /api/import - Importar dados
app.post('/api/import', async (req, res) => {
    try {
        const newTrades = req.body;
        
        // Validar estrutura dos dados
        if (!Array.isArray(newTrades)) {
            return res.status(400).json({ error: 'Dados devem ser um array' });
        }
        
        await fs.writeFile(DATA_FILE, JSON.stringify(newTrades, null, 2));
        res.json({ success: true, count: newTrades.length });
    } catch (error) {
        console.error('Erro ao importar dados:', error);
        res.status(500).json({ error: 'Erro ao importar dados' });
    }
});

// Rota para servir o frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Inicializar arquivo de dados se não existir
async function initializeDataFile() {
    try {
        await fs.access(DATA_FILE);
    } catch {
        // Arquivo não existe, criar com array vazio
        await fs.writeFile(DATA_FILE, JSON.stringify([]));
        console.log('Arquivo de dados criado com sucesso.');
    }
}

// Iniciar servidor
app.listen(PORT, async () => {
    await initializeDataFile();
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`API disponível em http://localhost:${PORT}/api/trades`);
});