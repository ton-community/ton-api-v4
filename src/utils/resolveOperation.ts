import { TxBody, parseBody } from "./rawTransactionToParsedTransaction";
import { SupportedMessageType, parseMessageBody } from "./parseMessageBody";
import { formatSupportedBody } from "./formatSupportedBody";
import { Address, Cell } from "@ton/core";

export type ParsedOperationItem = { kind: 'ton', amount: string; } | { kind: 'token', amount: string; };

export type Op = { type: SupportedMessageType, options?: { [key: string]: string } }

export type ParsedOperation = {
    address: string;
    comment?: string;
    items: ParsedOperationItem[];
    op?: Op;
};

export function resolveOperation(args: {
    account: Address,
    amount: bigint,
    body: TxBody | null,
}, isTestnet: boolean): ParsedOperation {

    // Resolve default address
    let address: Address = args.account;

    // Comment
    let comment: string | undefined = undefined;
    if (args.body && args.body.type === 'comment') {
        comment = args.body.comment;
    }

    // Resolve default op
    let op: Op | undefined = undefined;

    // Resolve default items
    let items: ParsedOperationItem[] = [];
    items.push({ kind: 'ton', amount: args.amount.toString(10) });

    // Simple payload overwrite
    if (args.body && args.body.type === 'payload') {
        let parsedBody = parseMessageBody(Cell.fromBoc(Buffer.from(args.body.cell, 'base64'))[0]);
        if (parsedBody) {
            let f = formatSupportedBody(parsedBody);
            if (f) {
                op = f;
            }

            if (parsedBody.type === 'jetton::transfer') {
                address = parsedBody.data.destination;
                let amount = parsedBody.data.amount;
                items.unshift({ kind: 'token', amount: amount.toString(10) });
                let body = parseBody(parsedBody.data.forwardPayload);
                if (body && body.type === 'comment') {
                    comment = body.comment;
                }
                op = { type: SupportedMessageType.JettonTransfer };
            } else if (parsedBody.type === 'jetton::transfer_notification') {
                if (parsedBody.data['sender']) {
                    address = parsedBody.data.sender;
                } else {
                    op = { type: SupportedMessageType.Airdrop };
                }
                let amount = parsedBody.data.amount;
                items.unshift({ kind: 'token', amount: amount.toString(10) });
                let body = parseBody(parsedBody.data.forwardPayload);
                if (body && body.type === 'comment') {
                    comment = body.comment;
                }
            }
        }
    }


    return {
        address: address.toString({ testOnly: isTestnet }),
        items,
        comment,
        op
    }
}