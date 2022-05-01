import { FastifyRequest, FastifyReply } from 'fastify';
import { LiteClient } from 'ton-lite-client';
import { warn } from "../../utils/log";
import { Address } from 'ton';

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
            if (account.state) {
                if (account.state.storage.state.type === 'uninit') {
                    state = { type: 'uninit' };
                } else if (account.state.storage.state.type === 'active') {
                    state = {
                        type: 'active',
                        code: account.state.storage.state.state.code!.toBoc({ idx: true }).toString('base64'),
                        data: account.state.storage.state.state.data!.toBoc({ idx: true }).toString('base64')
                    };
                } else {
                    state = {
                        type: 'frozen',
                        stateHash: account.state.storage.state.stateHash.toString('base64')
                    };
                }
            } else {
                state = { type: 'uninit' };
            }


            // Return data
            res.status(200)
                .header('Cache-Control', 'public, max-age=31536000')
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