# juno clock

A clock that moves toward midnight on documented evidence that AI systems are not under control. Static site, no build.

The record is `events.json`. Each entry: `date`, `w` (weight 1 to 5, see the rules table on the site), `title`, `body`, `source`. The clock starts at 23:30:00 and each weight point advances it 30 seconds. Sixty points is midnight.

To propose an entry, open an issue with the date, one line on what happened, the primary source, and the weight you think it deserves.

Run locally: `python3 -m http.server 5231` in this folder.

## Contract

`contracts/src/JunoClock.sol`. Burn JUNO through it (tokens go to the dead address), send fees to it in native coin, and the keeper calls `advance(weight)` when an entry is merged. Each advance releases `pot * seconds advanced / seconds left` to burners pro rata. Midnight releases everything. `forge install foundry-rs/forge-std` then `forge test` in `contracts/`.

Addresses go in `config.js`. While they are empty the wager page connects wallets but keeps burn and claim disabled.

## Deploy and run (Robinhood Chain)

Treasury and keeper: keystore `juno-treasury` at `~/.foundry/keystores`, address `0x91fa04c3E290d3D26251C603BbF30A0Ba076B03c`. Fund it with a little ETH on Robinhood Chain first.

```
cd contracts
JUNO=0x2bf8ce7d31f5856aca4bd8d4e3a99e336a0c1e18 KEEPER=0x91fa04c3E290d3D26251C603BbF30A0Ba076B03c SCORE=52 \
forge script script/Deploy.s.sol --rpc-url https://rpc.mainnet.chain.robinhood.com --account juno-treasury --broadcast
forge verify-contract <clock> src/JunoClock.sol:JunoClock --chain 4663 --verifier blockscout --verifier-url https://robinhoodchain.blockscout.com/api \
  --constructor-args $(cast abi-encode "constructor(address,address,uint256)" $JUNO $KEEPER 52)
```

Put the clock address in `config.js`. SCORE must equal the weight sum in `events.json` at deploy time.

Fees into the pot: send ETH to the clock address from the treasury (or point the fee receiver at it).

```
cast send <clock> --value 0.1ether --rpc-url https://rpc.mainnet.chain.robinhood.com --account juno-treasury
```

Logging an entry: add it to `events.json`, push, then advance the chain by the same weight so both stay in step.

```
cast send <clock> "advance(uint256)" 3 --rpc-url https://rpc.mainnet.chain.robinhood.com --account juno-treasury
```
