/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { LiteClient } from 'ton-lite-client';
import { warn } from "../../utils/log";
import { Address } from 'ton';
import { BN } from 'bn.js';
import {BigintToBN} from "../../utils/convert";

export function handleAccountGetChanged(client: LiteClient) {
    return async (req: FastifyRequest, res: FastifyReply) => {
        try {
            const seqno = parseInt((req.params as any).seqno, 10);
            const address = Address.parseFriendly((req.params as any).address).address;
            const lt = new BN((req.params as any).lt, 10);

            // Fetch account state
            let mcInfo = (await client.lookupBlockByID({ seqno: seqno, shard: '-9223372036854775808', workchain: -1 }));
            let account = await client.getAccountState(address, mcInfo.id);

            // Check if changed
            if (!account.lastTx || BigintToBN(account.lastTx.lt).gt(lt)) {
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