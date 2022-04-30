import cors from 'cors';
import express from 'express';
import { LiteClient } from 'ton-lite-client';
import { BlockSync } from '../sync/BlockSync';
import { log } from '../utils/log';
import { handleGetBlockAccount } from './handlers/handleGetBlockAccount';
import { handleGetBlock } from './handlers/handleGetBlock';
import { handleGetBlockLatest } from './handlers/handleGetBlockLatest';

export async function startApi(client: LiteClient, blockSync: BlockSync) {

    // Configure
    log('Starting API...');
    const app = express();
    app.use(cors());
    app.get('/', (req, res) => {
        res.send('Welcome to TON API v4!');
    });

    // Handlers
    app.get('/block/latest', handleGetBlockLatest(client, blockSync));
    app.get('/block/:seqno', handleGetBlock(client));
    app.get('/block/:seqno/:address', handleGetBlockAccount(client));

    // Start
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    await new Promise<void>((resolve) => app.listen(port, resolve));
    log('API ready on port http://localhost:' + port);
}