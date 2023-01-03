import { FastifyRequest, FastifyReply } from 'fastify';
import { Address } from 'ton';
import { LiteClient } from 'ton-lite-client';
import { warn } from "../../utils/log";

export function handleAccountTransaction(client: LiteClient) {
    return async (req: FastifyRequest, res: FastifyReply) => {
        try {
            let params = (req.params as { address: string, lt: string, seqno: string });
            let address = Address.parse(params.address);
            let lt = params.lt;
            const seqno = parseInt((req.params as any).seqno, 10);

            // Fetch account state
            let mcInfo = (await client.lookupBlockByID({ seqno: seqno, shard: '-9223372036854775808', workchain: -1 }));

            // Request
            let tx = await client.getAccountTransaction(address, lt, mcInfo.id);
            tx.transaction

            // Result
            let data = {
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