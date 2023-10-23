/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { beginCell, Cell, Dictionary } from '@ton/core';
import { LiteClient } from 'ton-lite-client';
import { warn } from "../../utils/log";
import { cellDictionaryToCell, uint256ToAddress } from "../../utils/convert";

export function handleGetConfig(client: LiteClient) {
    return async (req: FastifyRequest, res: FastifyReply) => {
        try {
            let filterParam = (req.params as any).ids as string;
            const seqno = parseInt((req.params as any).seqno, 10);
            let ids: number[] | null = null;
            if (filterParam) {
                ids = filterParam.split(',').map((v) => parseInt(v.trim(), 10));
            }

            // Check if seqno is valid
            if (seqno <= 0) {
                res.status(200)
                    .header('Cache-Control', 'public, max-age=31536000')
                    .send({
                        exist: false
                    });
            }

            // Check if seqno is valid
            const lastSeqno = (await client.getMasterchainInfo()).last.seqno;
            if (seqno > lastSeqno) {
                res.status(200)
                    .header('Cache-Control', 'public, max-age=5')
                    .send({
                        exist: false
                    });
            }

            // Fetch block and config
            let block = await client.lookupBlockByID({ workchain: -1, shard: '-9223372036854775808', seqno: seqno });
            let config = await client.getConfig(block.id);

            // Filter out
            let cell: Cell;
            if (ids && ids.length > 0) {
                let parsed = config.config;
                let dict = Dictionary.empty(Dictionary.Keys.Int(32), Dictionary.Values.Cell());
                for (let key of ids) {
                    let ex = parsed.get(key);
                    if (ex) {
                        dict.set(key, ex);
                    }
                }
                cell = beginCell().storeDictDirect(dict).endCell();
            } else {
                cell = cellDictionaryToCell(config.config)
            }

            // Return data
            res.status(200)
                .header('Cache-Control', 'public, max-age=31536000')
                .send({
                    exist: true,
                    config: {
                        cell: cell.toBoc({ idx: false }).toString('base64'),
                        address: uint256ToAddress(config.configAddress, -1).toString(),
                        globalBalance: {
                            coins: config.globalBalance.coins.toString()
                        }
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