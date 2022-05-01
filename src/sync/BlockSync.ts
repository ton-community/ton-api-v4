import EventEmitter from "events";
import { delay } from "teslabot";
import { LiteClient } from "ton-lite-client";
import { liteServer_MasterchainInfoExt } from "ton-lite-client/dist/schema";
import { log } from "../utils/log";
import { backoff } from "../utils/time";

function convertBlock(src: liteServer_MasterchainInfoExt) {
    return { seqno: src.last.seqno, time: src.lastUtime, now: src.now };
}

export class BlockSync extends EventEmitter {

    #client: LiteClient;
    #current: liteServer_MasterchainInfoExt;
    #stopped = false;
    #currentSimple: any;

    constructor(initial: liteServer_MasterchainInfoExt, client: LiteClient) {
        super();
        this.#client = client;
        this.#current = initial;
        this.#currentSimple = convertBlock(initial);
        this.start();
    }

    get current() {
        return this.#current;
    }

    get currentSimple() {
        return this.#currentSimple;
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
                    this.emit('block', convertBlock(nmc));
                    log('New block: ' + this.#current.last.seqno);
                }
                await delay(1000);
            }
        });
    }
}