import { FastifyRequest, FastifyReply } from 'fastify';
import { LiteClient } from 'ton-lite-client';
import { warn } from "../../utils/log";

export function handleGetConfig(client: LiteClient) {
    return async (req: FastifyRequest, res: FastifyReply) => {
        try {
            const seqno = parseInt((req.params as any).seqno, 10);

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

            // Return data
            res.status(200)
                .header('Cache-Control', 'public, max-age=31536000')
                .send({
                    exist: true,
                    config: {
                        cell: config.config.toBoc({ idx: false }).toString('base64'),
                        address: config.configAddress.toFriendly(),
                        globalBalance: {
                            coins: config.globalBalance.coins.toString(10)
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