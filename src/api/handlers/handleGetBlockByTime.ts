import { FastifyRequest, FastifyReply } from 'fastify';
import { Address } from 'ton';
import { LiteClient } from 'ton-lite-client';
import { warn } from "../../utils/log";

export function handleGetBlockByUtime(client: LiteClient) {
    return async (req: FastifyRequest, res: FastifyReply) => {
        try {
            const utime = parseInt((req.params as any).utime, 10);

            // Check if utime is valid
            if (utime <= 0) {
                res.status(200)
                    .header('Cache-Control', 'public, max-age=31536000')
                    .send({
                        exist: false
                    });
            }

            // Check if utime is not in future
            if (utime > Math.floor(Date.now() / 1000) - 12) {
                res.status(200)
                    .header('Cache-Control', `public, max-age=${utime - Math.floor(Date.now() / 1000) - 12}`)
                    .send({
                        exist: false
                    });
            }

            // Fetch block
            let header = await client.lookupBlockByUtime({
                shard: '',
                workchain: -1,
                utime
            });

            let block = await client.getFullBlock(header.id.seqno);

            // Return data
            res.status(200)
                .header('Cache-Control', 'public, max-age=31536000')
                .send({
                    exist: true,
                    block: {
                        shards: block.shards.map((sh) => ({
                            workchain: sh.workchain,
                            seqno: sh.seqno,
                            shard: sh.shard,
                            rootHash: sh.rootHash.toString('base64'),
                            fileHash: sh.fileHash.toString('base64'),
                            transactions: sh.transactions.map((tr) => ({
                                account: new Address(sh.workchain, tr.account).toFriendly(),
                                hash: tr.hash.toString('base64'),
                                lt: tr.lt
                            }))
                        }))
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