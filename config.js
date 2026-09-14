// Chain and contract addresses. Empty addresses put the wager page in design mode:
// the wallet still connects but burn and claim stay disabled.
export const C = {
  chainId: 56,
  chainName: 'BNB Smart Chain',
  currency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  rpc: 'https://bsc-dataseed.binance.org',
  explorer: 'https://bscscan.com',
  reownProjectId: '593590125b54385fa25cab236250e876',
  juno: '',   // JUNO ERC-20
  clock: '',  // JunoClock
};
