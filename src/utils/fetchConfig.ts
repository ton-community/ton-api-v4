/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import axios from "axios";
import * as t from 'io-ts';
import { log, warn } from "./log";

function intToIP(int: number) {
    var part1 = int & 255;
    var part2 = ((int >> 8) & 255);
    var part3 = ((int >> 16) & 255);
    var part4 = ((int >> 24) & 255);

    return part4 + "." + part3 + "." + part2 + "." + part1;
}

const codec = t.type({
    liteservers: t.array(t.type({
        ip: t.number,
        port: t.number,
        id: t.type({
            ['@type']: t.literal('pub.ed25519'),
            key: t.string
        })
    }))
})

export async function fetchConfig(src: string) {
    log('Fetching "' + src + '"');
    let config = (await axios.get(src)).data;
    if (!codec.is(config)) {
        warn(config);
        throw Error('Invalid config');
    }
    return config.liteservers.map((ls) => ({ ip: intToIP(ls.ip), port: ls.port, key: Buffer.from(ls.id.key, 'base64') }));
}