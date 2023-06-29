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
import {bigintToBase64} from "../../utils/convert";

export function handleAccountGetLite(client: LiteClient) {
    return async (req: FastifyRequest, res: FastifyReply) => {
        try {
            const seqno = parseInt((req.params as any).seqno, 10);
            const address = Address.parseFriendly((req.params as any).address).address;

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
                        bits: account.state.storageStats.used.bits.toString(),
                        cells: account.state.storageStats.used.cells.toString(),
                        publicCells: account.state.storageStats.used.publicCells.toString()
                    }
                };
                if (account.state.storage.state.type === 'uninit') {
                    state = {
                        type: 'uninit'
                    };
                } else if (account.state.storage.state.type === 'active') {
                    state = {
                        type: 'active',
                        codeHash: account.state.storage.state.state.code!.hash().toString('base64'),
                        dataHash: account.state.storage.state.state.data!.hash().toString('base64')
                    };
                } else {
                    state = {
                        type: 'frozen',
                        stateHash: account.state.storage.state.stateHash.toString()
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
                            hash: bigintToBase64(account.lastTx.hash)
                        } : null,
                        storageStat: storage
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