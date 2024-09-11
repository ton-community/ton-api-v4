/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { BN } from "bn.js";
import EventEmitter from "events";
import { delay, InvalidateSync } from "teslabot";
import { Address } from "@ton/core";
import { LiteClient } from "ton-lite-client";
import { liteServer_MasterchainInfoExt } from "ton-lite-client/dist/schema";
import { log } from "../utils/log";
import { backoff } from "../utils/time";

function convertBlock(src: liteServer_MasterchainInfoExt) {
    return { seqno: src.last.seqno, time: src.lastUtime, now: src.now };
}

function convertBlockFull(
    seqno: number,
    src: {
        shards: {
            rootHash: Buffer;
            fileHash: Buffer;
            transactions: {
                hash: Buffer;
                lt: string;
                account: Buffer;
            }[];
            workchain: number;
            seqno: number;
            shard: string;
        }[];
    },
    lastUtime: number
) {
    let changed: { [key: string]: { lt: string, hash: string } } = {};
    for (let s of src.shards) {
        for (let t of s.transactions) {
            let addr = new Address(s.workchain, t.account).toString();
            let ex = changed[addr];
            if (ex) {
                if (new BN(t.lt).gt(new BN(ex.lt))) {
                    changed[addr] = {
                        lt: t.lt,
                        hash: t.hash.toString('base64')
                    }
                }
            } else {
                changed[addr] = {
                    lt: t.lt,
                    hash: t.hash.toString('base64')
                }
            }
        }
    }
    return { seqno, changed, lastUtime };
}

export class BlockSync extends EventEmitter {

    #client: LiteClient;

    #current: liteServer_MasterchainInfoExt;
    #currentSimple: any;
    #currentFull: { seqno: number, changed: { [key: string]: { lt: string, hash: string } }, lastUtime: number } | null = null;

    #stopped = false;
    #fullBlockSync: InvalidateSync;

    constructor(initial: liteServer_MasterchainInfoExt, client: LiteClient) {
        super();
        this.#client = client;
        this.#current = initial;
        this.#currentSimple = convertBlock(initial);
        this.#fullBlockSync = new InvalidateSync(async () => {
            while (true) {

                let current = this.#current.last.seqno;
                let lastUtime = this.#current.lastUtime;

                if (!this.#currentFull) {
                    let block = await this.#client.getFullBlock(initial.last.seqno);
                    this.#currentFull = convertBlockFull(initial.last.seqno, block, initial.lastUtime);
                    this.emit('block_full', this.#currentFull);
                    continue;
                }

                // Fetch next
                if (current > this.#currentFull.seqno) {
                    let block = await this.#client.getFullBlock(current);
                    this.#currentFull = convertBlockFull(current, block, lastUtime);
                    this.emit('block_full', this.#currentFull);
                    continue;
                } else {
                    break;
                }
            }
        });
        this.#fullBlockSync.invalidate();
        this.start();
    }

    get current() {
        return this.#current;
    }

    get currentSimple() {
        return this.#currentSimple;
    }

    get currentFull() {
        return this.#currentFull;
    }

    stop() {
        this.#stopped = true;
    }

    private start() {
        log('Starting from block: ' + this.#current.last.seqno);
        backoff(async () => {
            while (!this.#stopped) {
                let nmc = await this.#client.getMasterchainInfoExt({
                    awaitSeqno: this.#current.last.seqno + 1
                });
                
                if (nmc.last.seqno > this.#current.last.seqno) {
                    this.#current = nmc;
                    this.#fullBlockSync.invalidate();
                    this.emit('block', convertBlock(nmc));
                    log('New block: ' + this.#current.last.seqno);
                }
                await delay(1000);
            }
        });
    }
}