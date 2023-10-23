import { Address, Cell } from "@ton/core";
import { crc32str } from "./crc32";

export enum SupportedMessageType {
    JettonExcesses = 'jetton::excesses',
    JettonTransfer = 'jetton::transfer',
    JettonTransferNotification = 'jetton::transfer_notification',
    Deposit = 'deposit',
    DepositOk = 'deposit::ok',
    Withdraw = 'withdraw',
    WithdrawAll = 'withdraw::all',
    WithdrawDelayed = 'withdraw::delayed',
    WithdrawOk = 'withdraw::ok',
    Airdrop = 'airdrop',
}

export type SupportedMessage =
    {
        type: SupportedMessageType.JettonExcesses,
        data: { queryId: number; }
    }
    | {
        type: SupportedMessageType.JettonTransfer,
        data: {
            queryId: number;
            amount: bigint;
            destination: Address;
            responseDestination: Address | null;
            customPayload: Cell | null;
            forwardTonAmount: bigint;
            forwardPayload: Cell;
        }
    } | {
        type: SupportedMessageType.JettonTransferNotification,
        data: {
            queryId: number;
            amount: bigint;
            sender: Address;
            forwardPayload: Cell;
        }
    } | {
        type: SupportedMessageType.Deposit,
        data: {
            queryId: number;
            gasLimit: bigint;
        }
    } | {
        type: SupportedMessageType.DepositOk,
        data: {}
    } | {
        type: SupportedMessageType.Withdraw,
        data: {
            stake: bigint;
            queryId: number;
            gasLimit: bigint;
        }
    } | {
        type: SupportedMessageType.WithdrawDelayed,
        data: {}
    } | {
        type: SupportedMessageType.WithdrawOk,
        data: {}
    };

export function parseMessageBody(payload: Cell): SupportedMessage | null {
    // Load OP
    let sc = payload.beginParse();
    if (sc.remainingBits < 32) {
        return null;
    }
    let op = sc.loadUint(32);
    if (op === 0) {
        return null;
    }

    switch (op) {
        case 0xd53276db: {
            let queryId = sc.loadUint(64);
            return {
                type: SupportedMessageType.JettonExcesses,
                data: { queryId }
            };
        }
        case 0xf8a7ea5: {
            let queryId = sc.loadUint(64);
            let amount = sc.loadCoins();
            let destination = sc.loadAddress();
            let responseDestination = sc.loadMaybeAddress();
            let customPayload = sc.loadBit() ? sc.loadRef() : null;
            let forwardTonAmount = sc.loadCoins();
            let forwardPayload = sc.loadBit() ? sc.loadRef() : sc.asCell();
            return {
                type: SupportedMessageType.JettonTransfer,
                data: {
                    queryId,
                    amount,
                    destination,
                    responseDestination,
                    customPayload,
                    forwardTonAmount,
                    forwardPayload
                }
            };
        }
        case 0x7362d09c: {
            let queryId = sc.loadUint(64);
            let amount = sc.loadCoins();
            let sender = sc.loadAddress();
            let forwardPayload = sc.loadBit() ? sc.loadRef() : sc.asCell();
            return {
                type: SupportedMessageType.JettonTransferNotification,
                data: {
                    queryId,
                    amount,
                    sender,
                    forwardPayload
                }
            };
        }
        case crc32str('op::stake_deposit'): {
            let queryId = sc.loadUint(64);
            let gasLimit = sc.loadCoins();
            return {
                type: SupportedMessageType.Deposit,
                data: {
                    queryId,
                    gasLimit,
                }
            };
        }
        case crc32str('op::stake_deposit::response'): {
            return {
                type: SupportedMessageType.DepositOk,
                data: {}
            };
        }
        case crc32str('op::stake_withdraw'): {
            let queryId = sc.loadUint(64);
            let gasLimit = sc.loadCoins();
            const stake = sc.loadCoins();
            return {
                type: SupportedMessageType.Withdraw,
                data: {
                    stake,
                    queryId,
                    gasLimit
                }
            };
        }
        case crc32str('op::stake_withdraw::delayed'): {
            return {
                type: SupportedMessageType.WithdrawDelayed,
                data: {}
            };
        }
        case crc32str('op::stake_withdraw::response'): {
            return {
                type: SupportedMessageType.WithdrawOk,
                data: {}
            };
        }
        default:
            return null;
    }
}