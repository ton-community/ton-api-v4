import express from 'express';
import { Address } from 'ton';
import { LiteClient } from 'ton-lite-client';
import { warn } from "../../utils/log";

export function handleGetBlock(client: LiteClient): express.RequestHandler {
    return async (req, res) => {
        try {
            const seqno = parseInt(req.params.seqno, 10);

            // Check if seqno is valid
            if (seqno <= 0) {
                res.status(200)
                    .set('Cache-Control', 'public, max-age=31536000')
                    .send({
                        exist: false
                    });
            }

            // Check if seqno is valid
            const lastSeqno = (await client.getMasterchainInfo()).last.seqno;
            if (seqno > lastSeqno) {
                res.status(200)
                    .set('Cache-Control', 'public, max-age=5')
                    .send({
                        exist: false
                    });
            }

            // Fetch block
            let block = await client.getFullBlock(seqno);

            // Return data
            res.status(200)
                .set('Cache-Control', 'public, max-age=31536000')
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
                    .set('Cache-Control', 'public, max-age=5')
                    .send('500 Internal Error');
            } catch (e) {
                warn(e);
            }
        }
    };
}