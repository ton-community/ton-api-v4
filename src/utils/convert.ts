import BN from "bn.js";
import {Dictionary} from "ton-core/dist/dict/Dictionary";
import {Address, beginCell} from "ton";

export function BNToBigint(num: BN) {
    return BigInt(num.toString());
}

export function bigintToBase64(bigint: bigint) {
    const hex = bigint.toString(16);
    const padding = hex.length % 2 === 0 ? '' : '0';
    const hexNumber = padding + hex;

    const buffer = Buffer.from(hexNumber, 'hex');
    return buffer.toString('base64');
}

export function cellDictionaryToCell(dict: Dictionary<any, any>){
    const builder = beginCell()
    dict.storeDirect(builder)
    return builder.endCell()
}

export function uint256ToBuffer32(num: bigint) {
    let buffer = Buffer.alloc(32);
    for (let i = 0; i < 32; i++) {
        buffer[31 - i] = Number((num >> BigInt(i * 8)) & BigInt(0xFF));
    }
    return buffer;
}

export function uint256ToAddress(num: bigint, workchain: number = 0){
    return new Address(workchain, uint256ToBuffer32(num))
}