import { AccountStatus, Address, Cell, CommonMessageInfo, ExternalAddress, Message, StateInit, Transaction, loadMessageRelaxed } from "@ton/core";
import { ParsedOperation, resolveOperation } from "./resolveOperation";

type ParsedAddressExternal = {
    bits: number;
    data: string;
};

export type TxBody = { type: 'comment', comment: string } | { type: 'payload', cell: string };

type ParsedMessageInfo = {
    type: 'internal';
    value: string;
    dest: string;
    src: string;
    bounced: boolean;
    bounce: boolean;
    ihrDisabled: boolean;
    createdAt: number;
    createdLt: string;
    fwdFee: string;
    ihrFee: string;
} | {
    type: 'external-in';
    dest: string;
    src: ParsedAddressExternal | null;
    importFee: string;
} | {
    type: 'external-out';
    dest: ParsedAddressExternal | null;
};

type ParsedStateInit = {
    splitDepth?: number | null;
    code: string | null;
    data: string | null;
    special?: { tick: boolean, tock: boolean } | null;
};

type ParsedMessage = {
    body: string,
    info: ParsedMessageInfo,
    init: ParsedStateInit | null,
};

export type ParsedTransaction = {
    address: string;
    lt: string;
    hash: string
    prevTransaction: {
        lt: string;
        hash: string;
    };
    time: number;
    outMessagesCount: number;
    oldStatus: AccountStatus;
    newStatus: AccountStatus;
    fees: string;
    update: {
        oldHash: string;
        newHash: string;
    };
    inMessage: ParsedMessage | null;
    outMessages: ParsedMessage[];
    parsed: {
        seqno: number | null;
        body: TxBody | null;
        status: 'success' | 'failed' | 'pending';
        dest: string | null;
        kind: 'out' | 'in';
        amount: string;
        resolvedAddress: string;
        bounced: boolean;
        mentioned: string[];
    },
    operation: ParsedOperation;
}

function externalAddressToParsed(address?: ExternalAddress | null) {
    if (!address) {
        return null;
    }

    return {
        bits: address.bits,
        data: address.value.toString(16),
    }
}

export function parseBody(cell: Cell): TxBody | null {
    let slice = cell.beginParse();
    if (slice.remainingBits < 32) {
        return null;
    }

    // Comment
    if (slice.loadUint(32) === 0) {
        let res = slice.loadBuffer(Math.floor(slice.remainingBits / 8)).toString();
        let rr = slice;
        if (rr.remainingRefs > 0) {
            rr = rr.loadRef().beginParse();
            res += rr.loadBuffer(Math.floor(rr.remainingBits / 8)).toString();
        }
        if (res.length > 0) {
            return { type: 'comment', comment: res };
        } else {
            return null;
        }
    }

    // Binary payload
    return { type: 'payload', cell: cell.toBoc({ idx: false }).toString('base64') };
}

function messageInfoToParsed(msgInfo: CommonMessageInfo, isTestnet: boolean): ParsedMessageInfo {
    switch (msgInfo.type) {
        case 'internal':
            return {
                value: msgInfo.value.coins.toString(10),
                type: msgInfo.type,
                dest: msgInfo.dest.toString({ testOnly: isTestnet }),
                src: msgInfo.src.toString({ testOnly: isTestnet }),
                bounced: msgInfo.bounced,
                bounce: msgInfo.bounce,
                ihrDisabled: msgInfo.ihrDisabled,
                createdAt: msgInfo.createdAt,
                createdLt: msgInfo.createdLt.toString(10),
                fwdFee: msgInfo.forwardFee.toString(10),
                ihrFee: msgInfo.ihrFee.toString(10),

            };
        case 'external-in':
            return { dest: msgInfo.dest.toString({ testOnly: isTestnet }), importFee: msgInfo.importFee.toString(10), type: msgInfo.type, src: externalAddressToParsed(msgInfo.src) };
        case 'external-out':
            return { dest: externalAddressToParsed(msgInfo.dest), type: msgInfo.type };
    }
}

function initToParsed(msgInfo?: StateInit | null): ParsedStateInit | null {
    if (!msgInfo) {
        return null;
    }
    return {
        code: msgInfo.code?.toBoc({ idx: false }).toString('base64') ?? null,
        data: msgInfo.data?.toBoc({ idx: false }).toString('base64') ?? null,
        special: msgInfo.special,
        splitDepth: msgInfo.splitDepth,
    }
}

function rawMessageToParsedMessage(msg: Message, isTestnet: boolean): ParsedMessage {
    return {
        body: msg.body.toBoc({ idx: false }).toString('base64'),
        info: messageInfoToParsed(msg.info, isTestnet),
        init: initToParsed(msg.init),
    }
}

export function rawTransactionToParsedTransaction(tx: Transaction, hash: string, own: Address, isTestnet: boolean): ParsedTransaction {
    const inMessageBody = tx.inMessage?.body || null;

    //
    // Resolve seqno
    //

    let seqno: number | null = null;
    let body: TxBody | null = null;
    let status: 'success' | 'failed' = 'success';
    let dest: string | null = null;
    if (tx.inMessage && tx.inMessage.info.type === 'external-in') {
        const parse = inMessageBody!.beginParse();
        parse.skip(512 + 32 + 32); // Signature + wallet_id + timeout
        seqno = parse.loadUint(32);
        const command = parse.loadUint(8);
        if (command === 0) {
            let message = loadMessageRelaxed(parse.loadRef().beginParse());
            if (message.info.dest && Address.isAddress(message.info.dest)) {
                dest = message.info.dest.toString({ testOnly: isTestnet });
            }
            body = parseBody(message.body);
        }
        if (tx.outMessagesCount === 0) {
            status = 'failed';
        }
    }

    if (tx.inMessage && tx.inMessage.info.type === 'internal') {
        body = parseBody(inMessageBody!);
    }

    //
    // Resolve amount
    //

    let amount = BigInt(0);
    if (tx.inMessage && tx.inMessage.info.type === 'internal') {
        amount = amount + tx.inMessage.info.value.coins;
    }
    for (let out of tx.outMessages.values()) {
        if (out.info.type === 'internal') {
            amount = amount - out.info.value.coins;
        }
    }

    //
    // Resolve address
    //

    let addressResolved: string;
    if (dest) {
        addressResolved = dest;
    } else if (tx.inMessage && tx.inMessage.info.type === 'internal') {
        addressResolved = tx.inMessage.info.src.toString({ testOnly: isTestnet });
    } else {
        addressResolved = own.toString({ testOnly: isTestnet });
    }
    //
    // Resolve kind
    //

    let kind: 'out' | 'in' = 'out';
    let bounced = false;
    if (tx.inMessage && tx.inMessage.info.type === 'internal') {
        kind = 'in';
        if (tx.inMessage.info.bounced) {
            bounced = true;
        }
    }

    const mentioned = new Set<string>();
    if (tx.inMessage && tx.inMessage.info.type === 'internal' && !tx.inMessage.info.src.equals(own)) {
        mentioned.add(tx.inMessage.info.src.toString({ testOnly: isTestnet }));
    }
    for (let out of tx.outMessages.values()) {
        if (out.info.dest && Address.isAddress(out.info.dest) && !out.info.dest.equals(own)) {
            mentioned.add(out.info.dest.toString({ testOnly: isTestnet }));
        }
    }

    return {
        address: own.toString({ testOnly: isTestnet }),
        fees: tx.totalFees.coins.toString(10),
        inMessage: tx.inMessage ? rawMessageToParsedMessage(tx.inMessage, isTestnet) : null,
        outMessages: tx.outMessages.values().map(a => rawMessageToParsedMessage(a, isTestnet)),
        lt: tx.lt.toString(10),
        hash,
        newStatus: tx.endStatus,
        oldStatus: tx.oldStatus,
        outMessagesCount: tx.outMessagesCount,
        prevTransaction: {
            hash: tx.prevTransactionHash.toString(16),
            lt: tx.prevTransactionLt.toString(10)
        },
        time: tx.now,
        update: {
            newHash: tx.stateUpdate.newHash.toString('base64'),
            oldHash: tx.stateUpdate.oldHash.toString('base64'),
        },
        parsed: {
            seqno,
            body,
            status,
            dest,
            amount: amount.toString(10),
            bounced,
            kind: kind,
            mentioned: [...mentioned],
            resolvedAddress: addressResolved,
        },
        operation: resolveOperation({
            account: own,
            amount: amount,
            body: body
        }, isTestnet),
    }
}