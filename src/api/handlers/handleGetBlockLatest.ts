import express from 'express';
import { LiteClient } from 'ton-lite-client';
import { warn } from "../../utils/log";

export function handleGetBlockLatest(client: LiteClient): express.RequestHandler {
    return async (req, res) => {
        try {
            let mc = await client.getMasterchainInfoExt();
            let maxAge = Math.min(Math.max((mc.lastUtime - mc.lastUtime) - 5, 1), 5);
            res.status(200)
                .set('Cache-Control', 'public, must-revalidate, max-age=' + maxAge)
                .send({
                    last: {
                        seqno: mc.last.seqno,
                        shard: mc.last.shard,
                        workchain: mc.last.workchain,
                        fileHash: mc.last.fileHash.toString('base64'),
                        rootHash: mc.last.rootHash.toString('base64')
                    },
                    init: {
                        fileHash: mc.init.fileHash.toString('base64'),
                        rootHash: mc.init.rootHash.toString('base64')
                    },
                    stateRootHash: mc.stateRootHash.toString('base64'),
                    now: mc.now,
                    syncTime: mc.lastUtime
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