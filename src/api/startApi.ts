import fastify from 'fastify';
import { LiteClient } from 'ton-lite-client';
import { BlockSync } from '../sync/BlockSync';
import { log } from '../utils/log';
import { handleAccountGet } from './handlers/handleAccountGet';
import { handleAccountRun } from './handlers/handleAccountRun';
import { handleBlockWatch } from './handlers/handleBlockWatch';
import { handleGetBlock } from './handlers/handleGetBlock';
import { handleGetBlockLatest } from './handlers/handleGetBlockLatest';

export async function startApi(client: LiteClient, blockSync: BlockSync) {

    // Configure
    log('Starting API...');
    const app = fastify();
    app.register(require('@fastify/websocket'));
    app.get('/', (req, res) => {
        res.send('Welcome to TON API v4!');
    });

    // Handlers
    app.get('/block/watch', { websocket: true } as any, handleBlockWatch(client, blockSync));
    app.get('/block/latest', handleGetBlockLatest(client, blockSync));
    app.get('/block/:seqno', handleGetBlock(client));
    app.get('/block/:seqno/:address', handleAccountGet(client));
    app.get('/block/:seqno/:address/run/:command/:args?', handleAccountRun(client));

    // Start
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    await app.listen(port);
    log('API ready on port http://localhost:' + port);
}