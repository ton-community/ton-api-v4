import BN from "bn.js";
import { Dictionary } from "ton-core/dist/dict/Dictionary";
import { Address } from "ton";
import {
    BNToBigint,
    bigintToBase64,
    cellDictionaryToCell,
    uint256ToBuffer32,
    uint256ToAddress,
    safeBigIntToNumber
} from './convert';

describe('Utility Functions', () => {
    test('BNToBigint converts BN to BigInt correctly', () => {
        const bn = new BN('123456789');
        expect(BNToBigint(bn)).toBe(BigInt('123456789'));
    });

    test('bigintToBase64 converts bigint to Base64 string correctly', () => {
        const bigint = 65537n;
        expect(bigintToBase64(bigint)).toBe('AQAB');
    });

    test('cellDictionaryToCell returns a valid cell', () => {
        const dict = Dictionary.empty(Dictionary.Keys.BigInt(32), Dictionary.Values.BigInt(32));
        dict.set(1n, 10n)
        const cell = cellDictionaryToCell(dict);
        const dictParsed = Dictionary.loadDirect(Dictionary.Keys.BigInt(32), Dictionary.Values.BigInt(32), cell)
        expect(dictParsed.get(1n)).toBe(10n);
    });

    test('uint256ToBuffer32 returns a correct buffer', () => {
        const bigint = BigInt('123456789');
        const buffer = uint256ToBuffer32(bigint);
        expect(buffer.length).toBe(32);
        expect(buffer[31]).toBe(0x15);
    });

    test('uint256ToAddress returns a correct Address', () => {
        const bigint = BigInt('123456789');
        const address = uint256ToAddress(bigint);
        const hexString = address.hash.toString('hex');
        expect(address).toBeInstanceOf(Address);
        expect(bigint).toBe(BigInt('0x' + hexString))
    });

    test('safeBigIntToNumber returns a number when within safe range', () => {
        const bigIntValue = BigInt('123456789');
        expect(safeBigIntToNumber(bigIntValue)).toBe(123456789);
    });

    test('safeBigIntToNumber throws error when above safe range', () => {
        const bigIntValue = BigInt('18446744073709551616'); // Above Number.MAX_SAFE_INTEGER
        expect(() => safeBigIntToNumber(bigIntValue)).toThrow('how did we get here? max cells is 64k, cell size 1024, so max theoretical number here is 65536000');
    });
});
