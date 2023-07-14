/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Address, Cell, TupleItem } from "ton-core";
import { Blockchain, BlockchainSnapshot, SmartContractSnapshot, createShardAccount, LogsVerbosity } from "@ton/sandbox";
import { randomBytes } from "crypto";
// auto tuple = vm::make_tuple_ref(
//     td::make_refint(0x076ef1ea),                // [ magic:0x076ef1ea
//     td::zero_refint(),                          //   actions:Integer
//     td::zero_refint(),                          //   msgs_sent:Integer
//     td::make_refint(now),                       //   unixtime:Integer
//     td::make_refint(account.block_lt),          //   block_lt:Integer
//     td::make_refint(start_lt),                  //   trans_lt:Integer
//     std::move(rand_seed_int),                   //   rand_seed:Integer
//     balance.as_vm_tuple(),                      //   balance_remaining:[Integer (Maybe Cell)]
//     my_addr,                                    //  myself:MsgAddressInt
//     vm::StackEntry::maybe(cfg.global_config));  //  global_config:(Maybe Cell) ] = SmartContractInfo;


export async function runContract(args: {
    method: string,
    code: Cell,
    data: Cell,
    address: Address,
    balance: bigint,
    config: Cell,
    lt: bigint,
    stack: TupleItem[]
}) {

    const blkch = await Blockchain.create({ config: args.config })

    let shardAccount = createShardAccount({
        address: args.address,
        code: args.code,
        data: args.data,
        balance: BigInt(args.balance.toString())
    }
    )

    const contractToExecute: SmartContractSnapshot = {
        address: args.address,
        account: shardAccount,
        lastTxTime: 1,
        verbosity: {
            print: false,
            blockchainLogs: false,
            vmLogs: "vm_logs",
            debugLogs: false,
        } as LogsVerbosity
    }
    const snapshot: BlockchainSnapshot = {
        contracts: [contractToExecute],
        networkConfig: args.config.toBoc({ idx: false }).toString('base64'),
        lt: BigInt(args.lt.toString()),
        verbosity: {} as LogsVerbosity,
        nextCreateWalletIndex: 0
    };
    await blkch.loadFrom(snapshot);
    await blkch.setShardAccount(args.address, shardAccount)

    let stack: TupleItem[] = [];
    for (let s of args.stack) {
        if (s.type === 'int') {
            stack.push({ type: 'int', value: BigInt(s.value.toString(10)) });
        } else if (s.type === 'cell') {
            stack.push({ type: 'cell', cell: Cell.fromBoc(s.cell.toBoc())[0] });
        } else if (s.type === 'null') {
            stack.push({ type: 'null' });
        } else if (s.type === 'slice') {
            stack.push({ type: 'slice', cell: Cell.fromBoc(s.cell.toBoc({ idx: false }))[0] });
        } else {
            throw Error('Unsupported');
        }
    }

    let randSeed = randomBytes(32);
    let now = Math.floor(Date.now() / 1000);

    return await blkch.runGetMethod(args.address, args.method, stack, { randomSeed: randSeed, now: now })

}