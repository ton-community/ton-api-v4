import BN from "bn.js";
import { Address, beginCell, Cell } from "ton";
import { TVMStackEntry, TVMStackEntryCell, TVMStackEntryCellSlice, TVMStackEntryInt, TVMStackEntryNull, TVMStackEntryTuple, runContract as executeContract } from 'ton-contract-executor';
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

const makeIntEntry = (value: number | BN): TVMStackEntryInt => ({ type: 'int', value: value.toString(10) });
const makeTuple = (items: TVMStackEntry[]): TVMStackEntryTuple => ({ type: 'tuple', value: items });
const makeNull = (): TVMStackEntryNull => ({ type: 'null' });
const makeCell = (cell: Cell): TVMStackEntryCell => ({ type: 'cell', value: cell.toBoc({ idx: false }).toString('base64') });
const makeSlice = (cell: Cell): TVMStackEntryCellSlice => ({ type: 'cell_slice', value: cell.toBoc({ idx: false }).toString('base64') });

export async function runContract(args: {
    method: string,
    code: Cell,
    data: Cell,
    address: Address,
    balance: BN,
    config: Cell,
    lt: BN
}) {

    // Configure
    let now = Math.floor(Date.now() / 1000);
    let balance = makeTuple([makeIntEntry(args.balance), makeNull()]);

    let addressCell = new Cell();
    addressCell.bits.writeAddress(args.address);

    let randSeed = randomBytes(32);

    let c7 = makeTuple([
        makeTuple([
            // [ magic:0x076ef1ea
            makeIntEntry(0x076ef1ea),
            // actions:Integer
            makeIntEntry(0),
            // msgs_sent:Integer
            makeIntEntry(0),
            // unixtime:Integer
            makeIntEntry(now),
            // block_lt:Integer
            makeIntEntry(args.lt),
            // trans_lt:Integer
            makeIntEntry(args.lt),
            // rand_seed:Integer
            makeIntEntry(new BN(randSeed)),
            // balance_remaining:[Integer (Maybe Cell)]
            balance,
            // myself:MsgAddressInt
            makeSlice(beginCell()
                .storeAddress(args.address)
                .endCell()),
            // global_config:(Maybe Cell) ] = SmartContractInfo;
            makeCell(args.config)
        ])
    ]);

    // Execute
    let result = await executeContract({
        code: args.code,
        dataCell: args.data,
        stack: [],
        method: args.method,
        c7,
        debug: false
    });
    // if (result.ok) {
    //     result.
    // }
}