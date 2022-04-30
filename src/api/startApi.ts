import cors from 'cors';
import express from 'express';
import { LiteClient } from 'ton-lite-client';
import { log } from '../utils/log';
import { handleGetAccount } from './handlers/handleGetAccount';
import { handleGetBlock } from './handlers/handleGetBlock';
import { handleGetBlockLatest } from './handlers/handleGetBlockLatest';

export async function startApi(client: LiteClient) {

    // Configure
    log('Starting API...');
    const app = express();
    app.use(cors());
    app.get('/', (req, res) => {
        res.send('Welcome to TON API v4!');
    });

    // Handlers
    app.get('/block/latest', handleGetBlockLatest(client));
    app.get('/block/:seqno', handleGetBlock(client));
    app.get('/account/:address', handleGetAccount(client));
    // app.get('/tx/:address', handleGetTransactions());
    // app.get('/status', handleGetStatus());

    // Start
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    await new Promise<void>((resolve) => app.listen(port, resolve));
    log('API ready on port http://localhost:' + port);
}