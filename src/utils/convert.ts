import BN from "bn.js";
import {Dictionary} from "ton-core";
import {beginCell, Cell} from "ton";

export function BigintToBN(num: bigint) {
    return new BN(num.toString());
}

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

export function cellDictionaryToCell(dict: Dictionary<number, Cell>){
    const cell = beginCell()
    dict.values().forEach(c=>cell.storeRef(c))
    return cell.endCell()
}
