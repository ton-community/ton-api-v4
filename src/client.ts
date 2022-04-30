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

    // Create engine
    let engines: LiteSingleEngine[] = [];
    for (let c of config) {
        for (let i = 0; i < parallelClients; i++) {
            engines.push(new LiteSingleEngine({ host: c.ip, port: c.port, publicKey: c.key }));
        }
    }
    let engine = new LiteRoundRobinEngine(engines);

    // Create client
    return new LiteClient({ engine: engine, batchSize: engines.length * 10 });
}