# GEB subgraph

A Graph protocol subgraph for GEB periphery contracts.

Currently indexes:
- Coin transfers
- protocol token transfers
- Saviors
- Uniswap v2 COIN/ETH swaps
- Recycling auctions

Note: This subgrpah is Kovan only

## Deploy on the hosted service

```
npm install -D

# To run once with the token from the dashboard
npm run auth <GRAPH AUTH TOKEN>

# For mainnet
npm run deploy-hosted-mainnet
```

## Local development

Configure the `docker/.env` to:

```
POSTGRES_PASSWORD=1234

# For MacOS
ETHEREUM_RPC=http://host.docker.internal:8545/

#For Linux
ETHEREUM_RPC=http://172.17.0.1:8545/

NETWORK=test
```

Run:

```
cd docker
docker-compose up -d
```

Then access the GraphQL endpoints using:

http://localhost/subgraphs/name/reflexer-labs/rai (HTTP queries)
