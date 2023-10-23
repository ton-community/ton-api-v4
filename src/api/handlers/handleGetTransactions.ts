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
import { warn } from "../../utils/log";

export function handleGetTransactions(client: LiteClient) {
    return async (req: FastifyRequest, res: FastifyReply) => {
        try {
            let params = (req.params as { address: string, lt: string, hash: string });
            let address = Address.parse(params.address);
            let lt = params.lt;
            let hash = Buffer.from(params.hash, 'base64');

            // Request
            let transactions = await client.getAccountTransactions(address, lt, hash, 20);

            // Result
            let data = {
                blocks: transactions.ids.map((id) => ({
                    workchain: id.workchain,
                    shard: id.shard,
                    seqno: id.seqno,
                    fileHash: id.fileHash.toString('base64'),
                    rootHash: id.rootHash.toString('base64'),
                })),
                boc: transactions.transactions.toString('base64')
            };

            // Return data
            res.status(200)
                .header('Cache-Control', 'public, max-age=31536000')
                .send(data);
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