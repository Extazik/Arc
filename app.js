import { arcIntegration } from './arc-integration.js';

// Инициализация App Kit
async function initApp() {
    try {
        await arcIntegration.initialize();
        console.log('App Kit initialized successfully');
    } catch (error) {
        console.error('Failed to initialize App Kit:', error);
    }
}

initApp();

// Переключение табов
function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`.tab[onclick="switchTab('${tabName}')"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

// Подключение кошелька
async function connectWallet() {
    try {
        await arcIntegration.initialize();
        // App Kit автоматически откроет модальное окно для подключения
    } catch (error) {
        console.error('Failed to connect wallet:', error);
    }
}

// Создание стрима
async function createStream() {
    const receiver = document.getElementById('receiver').value;
    const amountPerSecond = document.getElementById('amountPerSecond').value;
    const durationSeconds = document.getElementById('durationSeconds').value;
    
    const resultDiv = document.getElementById('result');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = 'Creating stream...';
    
    try {
        const response = await fetch('http://localhost:3000/api/create-stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ receiver, amountPerSecond, durationSeconds })
        });
        
        const data = await response.json();
        
        if (data.success) {
            resultDiv.innerHTML = `
                <h3>Stream Created!</h3>
                <p><strong>Stream ID:</strong> ${data.streamId}</p>
                <p><strong>Transaction:</strong> <a href="https://arc-testnet.blockscout.com/tx/${data.txHash}" target="_blank">${data.txHash}</a></p>
                <button onclick="checkStream('${data.streamId}')">Check Stream Status</button>
            `;
        } else {
            resultDiv.innerHTML = `<p>Error: ${data.error}</p>`;
        }
    } catch (error) {
        resultDiv.innerHTML = `<p>Error: ${error.message}</p>`;
    }
}

// Проверка стрима
async function checkStream(streamId) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = 'Loading stream info...';
    
    try {
        const response = await fetch(`http://localhost:3000/api/stream-info/${streamId}`);
        const data = await response.json();
        
        if (data.success) {
            const info = data.data;
            resultDiv.innerHTML = `
                <h3>Stream Info</h3>
                <p><strong>Sender:</strong> ${info.sender}</p>
                <p><strong>Receiver:</strong> ${info.receiver}</p>
                <p><strong>Amount/sec:</strong> ${info.amountPerSecond} wei</p>
                <p><strong>Active:</strong> ${info.active}</p>
                <p><strong>Available:</strong> ${info.available} wei</p>
            `;
        } else {
            resultDiv.innerHTML = `<p>Error: ${data.error}</p>`;
        }
    } catch (error) {
        resultDiv.innerHTML = `<p>Error: ${error.message}</p>`;
    }
}

// Бридж
async function executeBridge() {
    const amount = document.getElementById('bridgeAmount').value;
    const fromChain = document.getElementById('fromChain').value;
    
    try {
        await arcIntegration.bridgeToArc(amount, fromChain);
    } catch (error) {
        console.error('Bridge failed:', error);
    }
}

// Своп
async function executeSwap() {
    const fromToken = document.getElementById('fromToken').value;
    const toToken = document.getElementById('toToken').value;
    const amount = document.getElementById('swapAmount').value;
    const slippage = document.getElementById('slippage').value;
    
    try {
        await arcIntegration.swapTokens(fromToken, toToken, amount, parseFloat(slippage));
    } catch (error) {
        console.error('Swap failed:', error);
    }
}

// Экспорт функций для HTML onclick
window.switchTab = switchTab;
window.connectWallet = connectWallet;
window.createStream = createStream;
window.checkStream = checkStream;
window.executeBridge = executeBridge;
window.executeSwap = executeSwap;