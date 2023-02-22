/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { LiteClient } from 'ton-lite-client';
import { BlockSync } from '../../sync/BlockSync';
import { log, warn } from "../../utils/log";

export function handleGetBlockLatest(client: LiteClient, blockSync: BlockSync) {
    return async (req: FastifyRequest, res: FastifyReply) => {
        try {
            let mc = blockSync.current;
            let timeDelta = Math.floor(Date.now() / 1000) - mc.lastUtime;
            let maxAge = Math.min(Math.max(7 - timeDelta, 1), 5);
            res.status(200)
                .header('Cache-Control', 'public, must-revalidate, max-age=' + maxAge)
                .send({
                    last: {
                        seqno: mc.last.seqno,
                        shard: mc.last.shard,
                        workchain: mc.last.workchain,
                        fileHash: mc.last.fileHash.toString('base64'),
                        rootHash: mc.last.rootHash.toString('base64')
                    },
                    init: {
                        fileHash: mc.init.fileHash.toString('base64'),
                        rootHash: mc.init.rootHash.toString('base64')
                    },
                    stateRootHash: mc.stateRootHash.toString('base64'),
                    now: mc.lastUtime
                });
        } catch (e) {
            warn(e);
            try {
                res.status(500)
                    .header('Cache-Control', 'public, max-age=1')
                    .send('500 Internal Error');
            } catch (e) {
                warn(e);
            }
        }
    };
}