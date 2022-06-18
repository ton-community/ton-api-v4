import BN from "bn.js";
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
            balance: new BN(contract.account.balance.coins, 10),
            config: Cell.fromBoc(Buffer.from(config.config.cell, 'base64'))[0],
            lt: new BN(contract.account.last!.lt, 10),
            stack: []
        });
        console.warn('executed in ' + (Date.now() - start) + ' ms');
        console.warn(res);
    });
});