import express from 'express';
import { LiteClient } from 'ton-lite-client';
import { warn } from "../../utils/log";
import { Address } from 'ton';

export function handleGetAccount(client: LiteClient): express.RequestHandler {
    return async (req, res) => {
        try {
            const address = Address.parseFriendly(req.params.address).address;

            // Fetch account state
            let mcInfo = (await client.getMasterchainInfoExt());
            let account = await client.getAccountState(address, mcInfo.last);

            // Resolve state
            let state: any;
            if (account.state.storage.state.type === 'uninit') {
                state = { type: 'uninit' }
            } else if (account.state.storage.state.type === 'active') {
                state = {
                    type: 'active',
                    code: account.state.storage.state.state.code!.toBoc({ idx: true }).toString('base64'),
                    data: account.state.storage.state.state.data!.toBoc({ idx: true }).toString('base64')
                }
            } else {
                state = {
                    type: 'frozen',
                    stateHash: account.state.storage.state.stateHash.toString('base64')
                }
            }


            // Return data
            res.status(200)
                .set('Cache-Control', 'public, max-age=31536000')
                .send({
                    account: {
                        state,
                        balance: {
                            coins: account.balance.coins.toString(10)
                        },
                        last: account.lastTx ? {
                            lt: account.lastTx.lt,
                            hash: account.lastTx.hash.toString('base64')
                        } : null,
                    },
                    block: {
                        workchain: mcInfo.last.workchain,
                        seqno: mcInfo.last.seqno,
                        shard: mcInfo.last.shard,
                        fileHash: mcInfo.last.fileHash.toString('base64'),
                        rootHash: mcInfo.last.rootHash.toString('base64')
                    },
                    time: mcInfo.lastUtime
                });
        } catch (e) {
            warn(e);
            try {
                res.status(500).send('500 Internal Error');
            } catch (e) {
                warn(e);
            }
        }
    };
}