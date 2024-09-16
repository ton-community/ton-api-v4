/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { LiteClient } from 'ton-lite-client';
import { Address } from '@ton/core';
import { BlockSync } from '../../sync/BlockSync';
import { limitBlocksHistory } from '../limitBlocksHistory';

export function handleAccountGetChanged(client: LiteClient, sync: BlockSync) {
    return async (req: FastifyRequest, res: FastifyReply) => {
        try {
            const seqno = parseInt((req.params as any).seqno, 10);
            const address = Address.parseFriendly((req.params as any).address).address;
            const lt = BigInt((req.params as any).lt);

            if (limitBlocksHistory(sync, seqno)) {
                res.status(403)
                    .header('Cache-Control', 'public, max-age=30')
                    .send('403 Forbidden');
                return;
            }

            // Fetch account state
            let mcInfo = (await client.lookupBlockByID({ seqno: seqno, shard: '-9223372036854775808', workchain: -1 }));
            let account = await client.getAccountState(address, mcInfo.id);

            // Check if changed
            if (!account.lastTx || account.lastTx.lt>lt) {
                res.status(200)
                    .header('Cache-Control', 'public, max-age=31536000')
                    .send({
                        changed: true,
                        block: {
                            workchain: mcInfo.id.workchain,
                            seqno: mcInfo.id.seqno,
                            shard: mcInfo.id.shard,
                            fileHash: mcInfo.id.fileHash.toString('base64'),
                            rootHash: mcInfo.id.rootHash.toString('base64')
                        }
                    });
                return;
            }

            // Not changed
            res.status(200)
                .header('Cache-Control', 'public, max-age=31536000')
                .send({
                    changed: false,
                    block: {
                        workchain: mcInfo.id.workchain,
                        seqno: mcInfo.id.seqno,
                        shard: mcInfo.id.shard,
                        fileHash: mcInfo.id.fileHash.toString('base64'),
                        rootHash: mcInfo.id.rootHash.toString('base64')
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