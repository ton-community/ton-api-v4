import { FastifyRequest, FastifyReply } from 'fastify';
import { LiteClient } from 'ton-lite-client';
import { warn } from "../../utils/log";
import { Address } from 'ton';

export function handleAccountGetLight(client: LiteClient) {
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
                        codeHash: account.state.storage.state.state.code!.hash().toString('base64'),
                        dataHash: account.state.storage.state.state.data!.hash().toString('base64')
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