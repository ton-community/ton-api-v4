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
    let mc = await client.main.getMasterchainInfoExt();
    let blockSync = new BlockSync(mc, client.main);

    //
    // Start API
    //

    await startApi(client.main, client.child, blockSync);
})();