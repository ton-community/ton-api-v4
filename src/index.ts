/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

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

    let mc = await client.main.getMasterchainInfoExt().catch(e => {
        console.error('getMasterchainInfoExt', e);
    });

    if (!mc) {
        console.error('getMasterchainInfoExt Failed');
        return;
    }
    let blockSync = new BlockSync(mc, client.main);

    //
    // Start API
    //

    await startApi(client.main, client.child, blockSync);
})();

// catches the exception thrown when trying to connect to a dead liteserver.
process.on('uncaughtException', function (err) {
    // Handle the error prevents process exit    
    console.error('uncaughtException:', err);
});