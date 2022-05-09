import { TonClient4 } from "ton";

describe('runContract', () => {
    it('should execute contract', () => {
        const client = new TonClient4({ endpoint: 'https://mainnet-v4.tonhubapi.com' });
        let block = client.getBlock(20434403);
    });
});