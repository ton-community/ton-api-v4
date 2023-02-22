/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { LiteClient, LiteRoundRobinEngine, LiteSingleEngine } from 'ton-lite-client';
import { fetchConfig } from './utils/fetchConfig';

export async function createClient() {

    // Fetch config
    if (!process.env.TON_CONFIG) {
        console.warn('Unable to find TON_CONFIG');
        return null;
    }
    let config = await fetchConfig(process.env.TON_CONFIG);
    if (config.length === 0) {
        console.warn('No lite servers in config');
        return null;
    }

    // Resolve parameters
    let parallelClients = 50;
    if (process.env.TON_THREADS) {
        parallelClients = parseInt(process.env.TON_THREADS, 10);
    }

    // Create engines
    let commonClientEngines: LiteSingleEngine[] = [];
    let child: { clients: LiteClient[] }[] = []
    for (let c of config) {
        let clients: LiteClient[] = [];
        for (let i = 0; i < parallelClients; i++) {
            let engine = new LiteSingleEngine({ host: c.ip, port: c.port, publicKey: c.key });
            clients.push(new LiteClient({ engine, batchSize: 10 }));
            commonClientEngines.push(engine);
        }
        child.push({ clients });
    }

    // Create client
    let engine = new LiteRoundRobinEngine(commonClientEngines);
    let client = new LiteClient({ engine, batchSize: commonClientEngines.length * 10 });
    return { main: client, child };
}