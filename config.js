// Chain and contract addresses. Empty addresses put the wager page in design mode:
// the wallet still connects but burn and claim stay disabled.
export const C = {
  chainId: 4663,
  chainName: 'Robinhood Chain',
  currency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpc: 'https://rpc.mainnet.chain.robinhood.com',
  explorer: 'https://robinhoodchain.blockscout.com',
  reownProjectId: '593590125b54385fa25cab236250e876',
  juno: '0x2bf8ce7d31f5856aca4bd8d4e3a99e336a0c1e18',   // JUNO ERC-20
  clock: '',  // JunoClock, empty until deployed
};
