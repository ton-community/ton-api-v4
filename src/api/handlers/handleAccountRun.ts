import express from 'express';
import { LiteClient } from 'ton-lite-client';
import { log, warn } from "../../utils/log";
import { Address, Cell } from 'ton';
import { parseStack } from '../../parser/parseStack';

export function handleAccountRun(client: LiteClient): express.RequestHandler {
    return async (req, res) => {
        try {
            const seqno = parseInt(req.params.seqno, 10);
            const address = Address.parseFriendly(req.params.address).address;
            const command = req.params.command;
            const args = req.params.args as string | undefined;
            const parsedArgs = args && args.length > 0 ? Buffer.from(args, 'base64') : Buffer.alloc(0);

            // Fetch account state
            let mcInfo = (await client.lookupBlockByID({ seqno: seqno, shard: '-9223372036854775808', workchain: -1 }));
            let result = await client.runMethod(address, command, parsedArgs, mcInfo.id);
            let resultParsed = result.result ? parseStack(Cell.fromBoc(Buffer.from(result.result!, 'base64'))[0].beginParse()) : null;

            // Return data
            res.status(200)
                .set('Cache-Control', 'public, max-age=31536000')
                .send({
                    exitCode: result.exitCode,
                    result: resultParsed,
                    resultRaw: result.result ? result.result : null,
                    block: {
                        workchain: result.block.workchain,
                        seqno: result.block.seqno,
                        shard: result.block.shard,
                        rootHash: result.block.rootHash.toString('base64'),
                        fileHash: result.block.fileHash.toString('base64'),
                    },
                    shardBlock: {
                        workchain: result.shardBlock.workchain,
                        seqno: result.shardBlock.seqno,
                        shard: result.shardBlock.shard,
                        rootHash: result.shardBlock.rootHash.toString('base64'),
                        fileHash: result.shardBlock.fileHash.toString('base64'),
                    }
                });
        } catch (e) {
            warn(e);
            try {
                res.status(500)
                    .set('Cache-Control', 'public, max-age=1')
                    .send('500 Internal Error');
            } catch (e) {
                warn(e);
            }
        }
    };
}