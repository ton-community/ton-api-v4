/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { LiteClient } from 'ton-lite-client';
import { ParsedTransaction, rawTransactionToParsedTransaction } from '../../utils/rawTransactionToParsedTransaction';
import { Address, Cell, loadTransaction } from '@ton/ton';

export function handleGetParsedTransactions(client: LiteClient) {
    return async (req: FastifyRequest, res: FastifyReply) => {
        try {
            let params = (req.params as { address: string, lt: string, hash: string });
            let count = (req.query as any)?.count ? parseInt((req.query as any)?.count) : 20;
            let address = Address.parse(params.address);
            let lt = params.lt;
            let hash = Buffer.from(params.hash, 'base64');

            // Request
            let transactions = await client.getAccountTransactions(address, lt, hash, count);

            let cells = Cell.fromBoc(transactions.transactions);
            let parsedTransactions: ParsedTransaction[] = [];
            let blocks: { workchain: number; shard: string; seqno: number; fileHash: string; rootHash: string; }[] = [];

            transactions.ids.forEach((id, i) => {
                blocks.push({
                    workchain: id.workchain,
                    shard: id.shard,
                    seqno: id.seqno,
                    fileHash: id.fileHash.toString('base64'),
                    rootHash: id.rootHash.toString('base64'),
                });
                const tx = loadTransaction(cells[i].beginParse());
                const parsed = rawTransactionToParsedTransaction(tx, tx.hash().toString('base64'), address, false);
                parsedTransactions.push(parsed);
            });

            // Result
            let data = {
                blocks,
                transactions: parsedTransactions
            };

            // Return data
            res.status(200)
                .header('Cache-Control', 'public, max-age=31536000')
                .send(data);
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