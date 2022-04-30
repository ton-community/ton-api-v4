require('dotenv').config();

import { startApi } from "./api/startApi";
import { createClient } from "./client";
import { BlockSync } from "./sync/BlockSync";
import { log } from "./utils/log";

(async () => {

    //
    // Create client
    //

    log('Downloading configuration...');
    let client = await createClient();
    if (!client) {
        return;
    }

    //
    // Fetching initial state
    //

    log('Downloading current state....');
    let mc = await client.getMasterchainInfoExt();
    let blockSync = new BlockSync(mc, client);

    //
    // Start API
    //

    await startApi(client, blockSync);
})();