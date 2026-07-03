/arc-streaming-app
├── contracts/
│   ├── StreamingPayment.sol
│   └── Deploy.md
├── backend/
│   ├── server.js
│   └── .env
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── arc-integration.js  # NEW
├── package.json
└── README.md

# Arc Streaming Payments + App Kits

MVP для микроплатежей в реальном времени на Circle Arc с интеграцией Bridge, Swap и Send через App Kits SDK. [web:11][web:14]

## Features

- **Streaming Payments**: Оплата по секундам для AI-сервисов
- **Bridge**: Кросс-чейн перевод USDC через CCTP [web:11]
- **Swap**: Своп токенов с настраиваемым slippage [web:11]
- **Unified Balance**: Единый баланс для всех токенов

## Установка

```bash
# Install dependencies
npm install

# Setup environment
cp backend/.env.example backend/.env
# Edit backend/.env with your keys from Circle Console[2]

# Start backend
npm start

# Start frontend (with Vite)
npm run dev
```

## Получение Project ID

1. Зайдите в [Circle Console](https://console.circle.com)
2. Создайте новый проект
3. Скопируйте Project ID в `.env` [web:14]

## Как это работает

1. Пользователь подключает кошелёк через App Kit
2. Бриджит USDC на Arc через Bridge Kit
3. Создаёт стрим для AI-сервиса
4. AI получает оплату каждую секунду
5. Можно сделать swap токенов через Swap Kit [web:11][web:15]

## Тестнет

- RPC: https://arc-testnet.rpc.thirdweb.com
- Faucet: https://faucet.circle.com
- Blockscout: https://arc-testnet.blockscout.com [web:10]

## Документация

- [App Kits Docs](https://docs.arc.io/app-kit)
- [Bridge Kit](https://docs.arc.io/app-kit/bridge)
- [Swap Kit](https://docs.arc.io/app-kit/swap) [web:14]
