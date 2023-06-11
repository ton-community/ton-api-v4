/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { LiteClient, LiteRoundRobinEngine, LiteSingleEngine } from 'ton-lite-client';
import { fetchConfig } from './utils/fetchConfig';

function shuffleArray(array: any[]): any[] {
    // Clone the original array to avoid modifying the original
    const shuffledArray = [...array];

    // Start from the last element and swap it with a random element before it
    for (let i = shuffledArray.length - 1; i > 0; i--) {
        const randomIndex = Math.floor(Math.random() * (i + 1));
        [shuffledArray[i], shuffledArray[randomIndex]] = [shuffledArray[randomIndex], shuffledArray[i]];
    }

    return shuffledArray;
}

export async function createClient() {

    // Fetch config
    if (!process.env.TON_CONFIG) {
        console.warn('Unable to find TON_CONFIG');
        return null;
    }
    console.log('fetch config from: ', process.env.TON_CONFIG);
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

    // filter out live config only
    let liveConfig = [];

    for (let c of config) {
        let engine: LiteSingleEngine | undefined;
        try {
            engine = new LiteSingleEngine({ host: c.ip, port: c.port, publicKey: c.key });
            let client = new LiteClient({ engine, batchSize: 10 });
            const working: any = await client.getMasterchainInfo()
            // .catch(e => {
            //     engine.close();
            //     console.error('getMasterchainInfo', e);
            // });
            if (working.kind) {
                liveConfig.push(c)
            }
        } catch (e) {
            console.error(e, `Failed to connect to ${c.ip}:${c.port}`);
        }
        engine?.close();
    }
    // randomise live config so not all v4 instances would work with the same lite server
    liveConfig = shuffleArray(liveConfig);

    // Create engines
    let commonClientEngines: LiteSingleEngine[] = [];
    let child: { clients: LiteClient[] }[] = []
    for (let c of liveConfig) {
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