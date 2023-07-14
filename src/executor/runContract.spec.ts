/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Address, Cell, TonClient4 } from "ton";
import { runContract } from "./runContract";

describe('runContract', () => {
    it('should execute contract', async () => {
        const client = new TonClient4({ endpoint: 'https://mainnet-v4.tonhubapi.com' });
        let address = Address.parse('EQCkR1cGmnsE45N4K0otPl5EnxnRakmGqeJUNua5fkWhales');
        let config = await client.getConfig(20434403);
        let contract = await client.getAccount(20434403, address);
        if (contract.account.state.type !== 'active') {
            throw Error('Invalid state');
        }
        let start = Date.now();
        let dt = Cell.fromBoc(Buffer.from(contract.account.state.data!, 'base64'))[0];
        let res = await runContract({
            method: 'get_staking_status',
            code: Cell.fromBoc(Buffer.from(contract.account.state.code!, 'base64'))[0],
            data: dt,
            address,
            balance: BigInt(contract.account.balance.coins),
            config: Cell.fromBoc(Buffer.from(config.config.cell, 'base64'))[0],
            lt: BigInt(contract.account.last!.lt),
            stack: []
        });
        console.warn('executed in ' + (Date.now() - start) + ' ms');
        console.warn(res);
    });
});