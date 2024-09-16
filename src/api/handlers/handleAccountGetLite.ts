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
import { uint256ToBase64, safeBigIntToNumber } from "../../utils/convert";
import { BlockSync } from '../../sync/BlockSync';
import { limitBlocksHistory } from '../limitBlocksHistory';

export function handleAccountGetLite(client: LiteClient, sync: BlockSync) {
    return async (req: FastifyRequest, res: FastifyReply) => {
        try {
            const seqno = parseInt((req.params as any).seqno, 10);
            const address = Address.parseFriendly((req.params as any).address).address;

            if (limitBlocksHistory(sync, seqno)) {
                res.status(403)
                    .header('Cache-Control', 'public, max-age=30')
                    .send('403 Forbidden');
                return;
            }

            // Fetch account state
            let mcInfo = (await client.lookupBlockByID({ seqno: seqno, shard: '-9223372036854775808', workchain: -1 }));
            let account = await client.getAccountState(address, mcInfo.id);

            // Resolve state
            let state: any;
            let storage: any;
            if (account.state) {
                storage = {
                    lastPaid: account.state.storageStats.lastPaid,
                    duePayment: account.state.storageStats.duePayment ? account.state.storageStats.duePayment.toString() : null,
                    used: {
                        bits: safeBigIntToNumber(account.state.storageStats.used.bits),
                        cells: safeBigIntToNumber(account.state.storageStats.used.cells),
                        publicCells: safeBigIntToNumber(account.state.storageStats.used.publicCells)
                    }
                };
                if (account.state.storage.state.type === 'uninit') {
                    state = {
                        type: 'uninit'
                    };
                } else if (account.state.storage.state.type === 'active') {
                    state = {
                        type: 'active',
                        codeHash: account.state.storage.state.state.code?.hash().toString('base64') ?? null,
                        dataHash: account.state.storage.state.state.data?.hash().toString('base64') ?? null
                    };
                } else {
                    state = {
                        type: 'frozen',
                        stateHash: uint256ToBase64(account.state.storage.state.stateHash)
                    };
                }
            } else {
                storage = null;
                state = { type: 'uninit' };
            }

            // Convert currencies
            let currencies: { [id: number]: string } = {};
            if (account.balance.other) {
                for (let ec of account.balance.other) {
                    currencies[ec[0]] = ec[1].toString();
                }
            }

            // Return data
            res.status(200)
                .header('Cache-Control', 'public, max-age=31536000')
                .send({
                    account: {
                        state,
                        balance: {
                            coins: account.balance.coins.toString(),
                            currencies
                        },
                        last: account.lastTx ? {
                            lt: account.lastTx.lt.toString(),
                            hash: uint256ToBase64(account.lastTx.hash)
                        } : null,
                        storageStat: storage
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