import { fromNano } from "@ton/core";
import { SupportedMessage, SupportedMessageType } from "./parseMessageBody";
import { Op } from "./resolveOperation";

export function formatSupportedBody(supportedMessage: SupportedMessage): Op | null {
    if (supportedMessage.type === 'withdraw') {
        let coins = supportedMessage.data['stake'] as bigint;
        if (coins === BigInt(0)) {
            return { type: SupportedMessageType.WithdrawAll };
        } else {
            return { type: SupportedMessageType.Withdraw, options: { coins: fromNano(coins) } };
        }
    }
    return { type: supportedMessage.type }
}