import { delay } from "teslabot";
import { LiteClient } from "ton-lite-client";
import { liteServer_MasterchainInfoExt } from "ton-lite-client/dist/schema";
import { log } from "../utils/log";
import { backoff } from "../utils/time";

export class BlockSync {

    #client: LiteClient;
    #current: liteServer_MasterchainInfoExt;
    #stopped = false;

    constructor(initial: liteServer_MasterchainInfoExt, client: LiteClient) {
        this.#client = client;
        this.#current = initial;
        this.start();
    }

    get current() {
        return this.#current;
    }

    stop() {
        this.#stopped = true;
    }

    private start() {
        log('Starting from block: ' + this.#current.last.seqno);
        backoff(async () => {
            while (!this.#stopped) {
                let nmc = await this.#client.getMasterchainInfoExt();
                if (nmc.last.seqno > this.#current.last.seqno) {
                    this.#current = nmc;
                    log('New block: ' + this.#current.last.seqno);
                }
                await delay(1000);
            }
        });
    }
}