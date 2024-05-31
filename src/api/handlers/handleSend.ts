/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { LiteClient } from "ton-lite-client";
import { Address, Cell, loadMessageRelaxed, loadMessage } from '@ton/core';

const EMPTY_ADDRESS = Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c');
const RETRY_COUNT = 30;

async function broadcastPayload(clients: { clients: LiteClient[] }[], payload: Buffer) {
    return await Promise.any(clients.map(async (c) => {
        const cl = c.clients[Math.floor(Math.random() * c.clients.length)];
        return await cl.sendMessage(payload);
    }));
}

async function retrySend(clients: { clients: LiteClient[] }[], req: FastifyRequest, payload: Buffer) {
    for (let index = 0; index < RETRY_COUNT; index++) {
        try {
            const st = await broadcastPayload(clients, payload);
        }
        catch (e) {
            if (e instanceof AggregateError) {
                for (var errorInstance of e.errors) {
                    req.log.warn(`got error resending wallet tx: ${errorInstance}`);
                }
            } else {
                req.log.warn(`got error resending wallet tx: ${e}`);
            }
        }
        await new Promise(r => setTimeout(r, 1000));
    }
}

export function handleSend(clients: { clients: LiteClient[] }[]) {
    return async (req: FastifyRequest, res: FastifyReply) => {
        const boc: string = (req.body as any).boc;
        try {
            let isWalletTransfer = false;
            // Parse and serialize message
            const cell = Cell.fromBoc(Buffer.from(boc, 'base64'))[0];

            // Check if external message is from wallet to zero address
            try {
                const slice = cell.beginParse(true);
                const messageBody = loadMessage(slice).body;
                const messageBodySlice = messageBody.beginParse();
                // signature(512) + wallet_id(32) + timeout(32) + seqno(32) = 608
                messageBodySlice.skip(608);
                const opType = messageBodySlice.loadUint(8)
                if (opType == 0) {
                    isWalletTransfer = true
                }

                // all user wallets have message relaxed in references
                for (let i = 0; i < slice.remainingRefs; i++) {
                    try {
                        const relaxedMessage = loadMessageRelaxed(slice.loadRef().beginParse(true));
                        if (relaxedMessage.info.dest instanceof Address && relaxedMessage.info.dest.equals(EMPTY_ADDRESS)) {
                            res.status(400).send('400 Bad Request');
                            return;
                        }
                    } catch {
                        // ignore this ref
                    }
                }
            } catch (e) {
                // If failed to parse, then it is not a wallet message
            }

            const serialized = cell.toBoc({ idx: false });

            // Send in parallel to all endpoints
            const st = await broadcastPayload(clients, serialized);

            // Send response
            res.status(200).send({ status: st.status });

            // Use dirty hack to resend many times wallet transfer to be sure that it fits in incoming tx buffer
            if (st.status == 1 && isWalletTransfer) {
                retrySend(clients, req, serialized);
            }

        } catch (e) {
            if (e instanceof AggregateError) {
                for (var errorInstance of e.errors) {
                    req.log.warn(errorInstance);
                }
            } else {
                req.log.warn(e);
            }
            try {
                res.status(500)
                    .send('500 Internal Error');
            } catch (e) {
                req.log.warn(e);
            }
        }
    }
}