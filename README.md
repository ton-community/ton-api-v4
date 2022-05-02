# TON API v4

Scallable and CDN-friendly HTTP API for TON blockchain.

## API Endpoints

There are two public endpoints for this API:
* `mainnet` - https://mainnet-v4.tonhubapi.com
* `testnnet` - https://testnnet-v4.tonhubapi.com

WARNING: Beware that testnet API works only with recent blocks and doesn't have full history.

## Selfhosting

Easiest way to selfhost is to use docker:

```bash
docker run -e TON_CONFIG=https://your-config-url -p 3000:3000 tonwhales/ton-api-v4:v7
```

## Methods

### Get latest block

```
GET /block/latest
```

## License
MIT