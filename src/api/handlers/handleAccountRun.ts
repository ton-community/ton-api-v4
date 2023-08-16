/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { LiteClient } from 'ton-lite-client';
import { warn } from "../../utils/log";
import {Address, Cell, parseTuple, TupleItem, serializeTuple} from 'ton';
import { runContract } from '../../executor/runContract';
import { cellDictionaryToCell} from "../../utils/convert";

// Temporary work-around
const enableWorkaround = new Map<string, string>();

// Mainnet
enableWorkaround.set(Address.parse('EQCkR1cGmnsE45N4K0otPl5EnxnRakmGqeJUNua5fkWhales').toString(), 'get_staking_status');
enableWorkaround.set(Address.parse('EQCY4M6TZYnOMnGBQlqi_nyeaIB1LeBFfGgP4uXQ1VWhales').toString(), 'get_staking_status');
enableWorkaround.set(Address.parse('EQCOj4wEjXUR59Kq0KeXUJouY5iAcujkmwJGsYX7qPnITEAM').toString(), 'get_staking_status');
enableWorkaround.set(Address.parse('EQBI-wGVp_x0VFEjd7m9cEUD3tJ_bnxMSp0Tb9qz757ATEAM').toString(), 'get_staking_status');
enableWorkaround.set(Address.parse('EQDFvnxuyA2ogNPOoEj1lu968U4PP8_FzJfrOWUsi_o1CLUB').toString(), 'get_staking_status');
enableWorkaround.set(Address.parse('EQA_cc5tIQ4haNbMVFUD1d0bNRt17S7wgWEqfP_xEaTACLUB').toString(), 'get_staking_status');
enableWorkaround.set(Address.parse('EQBYtJtQzU3M-AI23gFM91tW6kYlblVtjej59gS8P3uJ_ePN').toString(), 'get_staking_status');
enableWorkaround.set(Address.parse('EQCpCjQigwF27KQ588VhQv9jm_DUuL_ZLY3HCf_9yZW5_ePN').toString(), 'get_staking_status');
enableWorkaround.set(Address.parse('EQDkCrGT_lwaKXZf6y3YuJI213PrH60JqoQQO-GT2VMorgen').toString(), 'get_staking_status');
enableWorkaround.set(Address.parse('EQBWc3jORk0evkkZYV4OanMhcfJEyz_mN7rQWYM7wiMorgen').toString(), 'get_staking_status');
enableWorkaround.set(Address.parse('EQAA_5_dizuA1w6OpzTSYvXhvUwYTDNTW_MZDdZ0CGKeeper').toString(), 'get_staking_status');
enableWorkaround.set(Address.parse('EQDvvBmP3wUcjoXPY1jHfT4-fgb294imVYH5EHdLnAKeeper').toString(), 'get_staking_status');
enableWorkaround.set(Address.parse('EQDhGXtbR6ejNQucRcoyzwiaF2Ke-5T8reptsiuZ_mLockup').toString(), 'get_staking_status');
enableWorkaround.set(Address.parse('EQDg5ThqQ1t9eriIv2HkH6XUiUs_Wd4YmXZeGpnPzwLockup').toString(), 'get_staking_status');

// Testnet
enableWorkaround.set(Address.parse('kQBs7t3uDYae2Ap4686Bl4zGaPKvpbauBnZO_WSop1whaLEs').toString(), 'get_staking_status');
enableWorkaround.set(Address.parse('kQDsPXQhe6Jg5hZYATRfYwne0o_RbReMG2P3zHfcFUwHALeS').toString(), 'get_staking_status');
enableWorkaround.set(Address.parse('kQCkXp5Z3tJ_eAjFG_0xbbfx2Oh_ESyY6Nk56zARZDwhales').toString(), 'get_staking_status');
enableWorkaround.set(Address.parse('kQDV1LTU0sWojmDUV4HulrlYPpxLWSUjM6F3lUurMbwhales').toString(), 'get_staking_status');

// Work-around for staking
const hotfix = new Map<string, Map<string, (src: TupleItem[]) => TupleItem[]>>();
// hotfix.set(Address.parse('EQCkR1cGmnsE45N4K0otPl5EnxnRakmGqeJUNua5fkWhales').toString(), new Map<string, (src: TupleItem[]) => TupleItem[]>().set('get_staking_status', (src) => {
//     if (src[2].type === 'int') {
//         if (src[2].value.gt(new BN(Number.MAX_SAFE_INTEGER))) {
//             src[2].value = new BN(Number.MAX_SAFE_INTEGER);
//         }
//     }
//     return src;
// }));

function stackToString(item: TupleItem): any {
    if (item.type === 'null') {
        return { type: 'null' };
    } else if (item.type === 'builder') {
        return { type: 'builder', cell: item.cell.toBoc({ idx: false, crc32: false }).toString('base64') }
    } else if (item.type === 'cell') {
        return { type: 'cell', cell: item.cell.toBoc({ idx: false, crc32: false }).toString('base64') }
    } else if (item.type === 'slice') {
        return { type: 'slice', cell: item.cell.toBoc({ idx: false, crc32: false }).toString('base64') }
    } else if (item.type === 'int') {
        return { type: 'int', value: item.value.toString(10) }
    } else if (item.type === 'nan') {
        return { type: 'nan' }
    } else if (item.type === 'tuple') {
        return { type: 'tuple', items: item.items.map(stackToString) }
    } else {
        throw Error('Invalid item')
    }
}

export function handleAccountRun(client: LiteClient) {
    return async (req: FastifyRequest, res: FastifyReply) => {
        try {
            const seqno = parseInt((req.params as any).seqno, 10);
            const address = Address.parseFriendly((req.params as any).address).address;
            const command = (req.params as any).command as string;
            const args = (req.method.toLowerCase() === 'get' ? (req.params as any).args : (typeof req.body === 'string' ? req.body : undefined)) as string | undefined;
            const parsedArgs = args && args.length > 0 ? Buffer.from(args, 'base64') : Buffer.alloc(0);
            let stackArgs: TupleItem[] = [];
            if (parsedArgs.length > 0) {
                stackArgs = parseTuple(Cell.fromBoc(parsedArgs)[0]);
            }

            // Fetch account state
            let mcInfo = (await client.lookupBlockByID({ seqno: seqno, shard: '-9223372036854775808', workchain: -1 }));

            // Enable work-around for some contracts
            let wa = enableWorkaround.get(address.toString());
            if (wa === command) {
                let state = await client.getAccountState(address, mcInfo.id);

                // If no active account
                if (!state.state || state.state.storage.state.type !== 'active') {
                    res.status(200)
                        .header('Cache-Control', 'public, max-age=31536000')
                        .send({
                            arguments: stackArgs.map(stackToString),
                            result: null,
                            exitCode: -256,
                            resultRaw: null,
                            block: {
                                workchain: state.block.workchain,
                                seqno: state.block.seqno,
                                shard: state.block.shard,
                                rootHash: state.block.rootHash.toString('base64'),
                                fileHash: state.block.fileHash.toString('base64'),
                            },
                            shardBlock: {
                                workchain: state.shardBlock.workchain,
                                seqno: state.shardBlock.seqno,
                                shard: state.shardBlock.shard,
                                rootHash: state.shardBlock.rootHash.toString('base64'),
                                fileHash: state.shardBlock.fileHash.toString('base64'),
                            }
                        });
                    return;
                }

                // Fetch config
                let config = await client.getConfig(state.block);

                // Execute
                let executionResult = await runContract({
                    method: command,
                    code: state.state.storage.state.state.code!,
                    data: state.state.storage.state.state.data!,
                    address: address,
                    balance: state.state.storage.balance.coins,
                    config: cellDictionaryToCell(config.config),
                    lt: state.state.storage.lastTransLt,
                    stack: []
                });

                // Handle response
                if (executionResult.ok) {
                    let resStack: TupleItem[] = [];
                    for (let s of executionResult.stack) {
                        if (s.type === 'cell') {
                            resStack.push({ type: 'cell', cell: Cell.fromBoc(Buffer.from(s.value, 'base64'))[0] });
                        } else if (s.type === 'cell_slice') {
                            resStack.push({ type: 'slice', cell: Cell.fromBoc(Buffer.from(s.value, 'base64'))[0] });
                        } else if (s.type === 'int') {
                            resStack.push({ type: 'int', value: BigInt(s.value) });
                        } else if (s.type === 'null') {
                            resStack.push({ type: 'null' });
                        } else {
                            throw Error('Unknown stack item')
                        }
                    }
                    let hf = hotfix.get(address.toString());
                    if (hf) {
                        let hff = hf.get(command);
                        if (hff) {
                            resStack = hff(resStack);
                        }
                    }
                    res.status(200)
                        .header('Cache-Control', 'public, max-age=31536000')
                        .send({
                            arguments: stackArgs.map(stackToString),
                            result: resStack.map(stackToString),
                            exitCode: executionResult.exit_code!,
                            resultRaw: serializeTuple(resStack).toBoc({ idx: false }).toString('base64'),
                            block: {
                                workchain: state.block.workchain,
                                seqno: state.block.seqno,
                                shard: state.block.shard,
                                rootHash: state.block.rootHash.toString('base64'),
                                fileHash: state.block.fileHash.toString('base64'),
                            },
                            shardBlock: {
                                workchain: state.shardBlock.workchain,
                                seqno: state.shardBlock.seqno,
                                shard: state.shardBlock.shard,
                                rootHash: state.shardBlock.rootHash.toString('base64'),
                                fileHash: state.shardBlock.fileHash.toString('base64'),
                            }
                        });
                    return;
                } else {
                    res.status(200)
                        .header('Cache-Control', 'public, max-age=31536000')
                        .send({
                            arguments: stackArgs.map(stackToString),
                            result: null,
                            exitCode: executionResult.exit_code!,
                            resultRaw: null,
                            block: {
                                workchain: state.block.workchain,
                                seqno: state.block.seqno,
                                shard: state.block.shard,
                                rootHash: state.block.rootHash.toString('base64'),
                                fileHash: state.block.fileHash.toString('base64'),
                            },
                            shardBlock: {
                                workchain: state.shardBlock.workchain,
                                seqno: state.shardBlock.seqno,
                                shard: state.shardBlock.shard,
                                rootHash: state.shardBlock.rootHash.toString('base64'),
                                fileHash: state.shardBlock.fileHash.toString('base64'),
                            }
                        });
                    return;
                }
            }

            // Normal execution
            let result = await client.runMethod(address, command, parsedArgs, mcInfo.id);
            let resultParsed = result.result ? parseTuple(Cell.fromBoc(Buffer.from(result.result!, 'base64'))[0]) : null;

            // Return data
            res.status(200)
                .header('Cache-Control', 'public, max-age=31536000')
                .send({
                    arguments: stackArgs.map(stackToString),
                    result: resultParsed ? resultParsed.map(stackToString) : null,
                    exitCode: result.exitCode,
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
                    .header('Cache-Control', 'public, max-age=1')
                    .send('500 Internal Error');
            } catch (e) {
                warn(e);
            }
        }
    };
}
