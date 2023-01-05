import { BN } from 'bn.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import { Address, Builder } from 'ton';
import { LiteClient } from 'ton-lite-client';
import { warn } from "../../utils/log";

const buffToInt64Str = (buff: Buffer) => new Builder()
    .storeBuffer(buff).endCell().beginParse().readInt(64).toString(10);

export function handleAccountTransaction(client: LiteClient) {
    return async (req: FastifyRequest, res: FastifyReply) => {
        try {
            let params = (req.params as {
                wc: string,
                shard: string,
                address: string,
                lt: string,
                seqno: string
            });

            const workchain = parseInt(params.wc, 10);
            const shard = buffToInt64Str(Buffer.from(params.shard, 'hex'));
            const address = Address.parse(params.address);
            const seqno = parseInt((req.params as any).seqno, 10);

            let mcinfo = await client.lookupBlockByID({seqno, shard, workchain});
            let tx = await client.getAccountTransaction(address, params.lt, mcinfo.id);

            let data = { // result
                block: {
                    workchain: tx.id.workchain,
                    shard: tx.id.shard,
                    seqno: tx.id.seqno,
                    fileHash: tx.id.fileHash.toString('base64'),
                    rootHash: tx.id.rootHash.toString('base64'),
                },
                proof: tx.proof.toString('base64'),
                boc: tx.transaction.toString('base64')
            };

            // return data
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
