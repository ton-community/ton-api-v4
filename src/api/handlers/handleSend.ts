/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { LiteClient } from "ton-lite-client";
import { warn } from '../../utils/log';
import { Cell } from '@ton/core';

export function handleSend(clients: { clients: LiteClient[] }[]) {
    return async (req: FastifyRequest, res: FastifyReply) => {
        const boc: string = (req.body as any).boc;
        try {
            res.status(500)
                    .send('500 Internal Error');
            // Parse and serialize message
            // let cell = Cell.fromBoc(Buffer.from(boc, 'base64'))[0];
            // let serialized = cell.toBoc({ idx: false });

            // Send in parallel to all endpoints
            // let st = await Promise.any(clients.map(async (c) => {
                // let cl = c.clients[Math.floor(Math.random() * c.clients.length)];
                // return await cl.sendMessage(serialized);
            // }));

            // Send response
            // res.status(200).send({ status: st.status });
        } catch (e) {
            warn(e);
            try {
                res.status(500)
                    .send('500 Internal Error');
            } catch (e) {
                warn(e);
            }
        }
    }
}