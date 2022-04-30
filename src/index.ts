require('dotenv').config();

import { startApi } from "./api/startApi";
import { createClient } from "./client";
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
    // Start API
    //

    await startApi(client);
})();