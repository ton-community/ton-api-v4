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
import { Address, Cell } from 'ton';

export function handleAccountGet(client: LiteClient) {
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
                    lastPaid: account.state.storageStat.lastPaid,
                    duePayment: account.state.storageStat.duePayment ? account.state.storageStat.duePayment.toString(10) : null,
                    used: {
                        bits: account.state.storageStat.used.bits,
                        cells: account.state.storageStat.used.cells,
                        publicCells: account.state.storageStat.used.publicCells
                    }
                };
                if (account.state.storage.state.type === 'uninit') {
                    state = {
                        type: 'uninit'
                    };
                } else if (account.state.storage.state.type === 'active') {
                    state = {
                        type: 'active',
                        code: account.state.storage.state.state.code ? account.state.storage.state.state.code.toBoc({ idx: false }).toString('base64') : null,
                        data: account.state.storage.state.state.data ? account.state.storage.state.state.data.toBoc({ idx: false }).toString('base64') : null,
                    };
                } else {
                    state = {
                        type: 'frozen',
                        stateHash: account.state.storage.state.stateHash.toString('base64')
                    };
                }
            } else {
                storage = null;
                state = { type: 'uninit' };
            }

            // Convert currencies
            let currencies: { [id: number]: number } = {};
            if (account.balance.extraCurrencies) {
                for (let ec of account.balance.extraCurrencies) {
                    currencies[ec[0]] = ec[1];
                }
            }


            // Return data
            res.status(200)
                .header('Cache-Control', 'public, max-age=31536000')
                .send({
                    account: {
                        state,
                        balance: {
                            coins: account.balance.coins.toString(10),
                            currencies
                        },
                        last: account.lastTx ? {
                            lt: account.lastTx.lt,
                            hash: account.lastTx.hash.toString('base64')
                        } : null,
                        storageStat: storage
                    },
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