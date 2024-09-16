/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { Address } from '@ton/core';
import { LiteClient } from 'ton-lite-client';
import { BlockSync } from '../../sync/BlockSync';
import { limitBlocksHistory } from '../limitBlocksHistory';

export function handleGetBlock(client: LiteClient, sync: BlockSync) {
    return async (req: FastifyRequest, res: FastifyReply) => {
        try {
            const seqno = parseInt((req.params as any).seqno, 10);

            // Check if seqno is valid
            if (seqno <= 0) {
                res.status(200)
                    .header('Cache-Control', 'public, max-age=31536000')
                    .send({
                        exist: false
                    });
            }

            // Check if seqno is valid
            const lastSeqno = sync.current.last.seqno;
            if (seqno > lastSeqno) {
                res.status(200)
                    .header('Cache-Control', 'public, max-age=5')
                    .send({
                        exist: false
                    });
                return;
            }

            if (limitBlocksHistory(sync, seqno)) {
                res.status(403)
                    .header('Cache-Control', 'public, max-age=30')
                    .send('403 Forbidden');
                return;
            }

            // Fetch block
            let block = await client.getFullBlock(seqno);

            // Return data
            res.status(200)
                .header('Cache-Control', 'public, max-age=31536000')
                .send({
                    exist: true,
                    block: {
                        shards: block.shards.map((sh) => ({
                            workchain: sh.workchain,
                            seqno: sh.seqno,
                            shard: sh.shard,
                            rootHash: sh.rootHash.toString('base64'),
                            fileHash: sh.fileHash.toString('base64'),
                            transactions: sh.transactions.map((tr) => ({
                                account: new Address(sh.workchain, tr.account).toString(),
                                hash: tr.hash.toString('base64'),
                                lt: tr.lt
                            }))
                        }))
                    }
                });
        } catch (e) {
            req.log.warn(e);
            try {
                res.status(500)
                    .header('Cache-Control', 'public, max-age=1')
                    .send('500 Internal Error');
            } catch (e) {
                req.log.warn(e);
            }
        }
    };
}