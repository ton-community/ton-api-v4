import BN from "bn.js";
import { Address, beginCell, Dictionary } from "@ton/core";

export function BNToBigint(num: BN) {
    return BigInt(num.toString());
}

export function bigintToBase64(bigint: bigint) {
    const hex = bigint.toString(16);
    const hexNumber = hex.padStart(64, "0");

    const buffer = Buffer.from(hexNumber, 'hex');
    return buffer.toString('base64');
}

export function cellDictionaryToCell(dict: Dictionary<any, any>) {
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

export function uint256ToAddress(num: bigint, workchain: number = 0) {
    return new Address(workchain, uint256ToBuffer32(num))
}

export function safeBigIntToNumber(bigIntValue: bigint): Number {
    if (bigIntValue <= Number.MAX_SAFE_INTEGER) {
        return Number(bigIntValue);
    } else {
        throw("how did we get here? max cells is 64k, cell size 1024, so max theoretical number here is 65536000")
    }
}
