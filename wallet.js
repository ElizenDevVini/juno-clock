// Reown AppKit on a static page. The bundle is large, so it loads on the first click, or at
// page load when this browser connected through it before. Falls back to window.ethereum.
const VIEM_URL = 'https://cdn.jsdelivr.net/npm/viem@2.56.3/+esm';
const APPKIT_URL = 'https://cdn.jsdelivr.net/npm/@reown/appkit-cdn@1.8.23/dist/appkit.js';

const hex = (n) => '0x' + n.toString(16);
const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

export const loadViem = () => import(VIEM_URL);

function chainDef(C) {
  return {
    id: C.chainId, name: C.chainName, nativeCurrency: C.currency,
    rpcUrls: { default: { http: [C.rpc] } },
    blockExplorers: { default: { name: 'Explorer', url: C.explorer } },
  };
}

export function createWallet({ viem, C, onConnected, onNoWallet }) {
  let kit, adapter, modal, owner, appkitTried = false, wantModal = false;

  async function setupAppKit() {
    if (modal || appkitTried) return modal;
    appkitTried = true;
    kit = await import(APPKIT_URL);
    const network = kit.networks.defineChain({ ...chainDef(C), caipNetworkId: 'eip155:' + C.chainId, chainNamespace: 'eip155' });
    adapter = new kit.WagmiAdapter({ networks: [network], projectId: C.reownProjectId });
    modal = kit.createAppKit({
      adapters: [adapter], networks: [network], defaultNetwork: network, projectId: C.reownProjectId,
      metadata: { name: 'Juno Clock', description: 'Burn JUNO, earn from the pot when the clock moves', url: location.origin, icons: [location.origin + '/creature.png'] },
      features: { analytics: false, email: false, socials: [], swaps: false, onramp: false },
      themeMode: 'light',
      themeVariables: {
        '--w3m-accent': '#5b3df5', '--w3m-color-mix': '#f3f0e8', '--w3m-color-mix-strength': 30,
        '--w3m-border-radius-master': '0px', '--w3m-font-family': '"IBM Plex Mono", monospace',
      },
    });
    modal.subscribeAccount((account) => {
      if (account.isConnected && account.address) {
        if (owner) { if (!same(owner, account.address)) location.reload(); return; }
        connected(account.address, 'reown').catch(console.error);
      } else if (owner) {
        location.reload();
      } else if (wantModal) {
        wantModal = false;
        modal.open();
      }
    });
    return modal;
  }

  async function connectInjected() {
    const eth = window.ethereum;
    if (!eth) return onNoWallet?.();
    const [addr] = await eth.request({ method: 'eth_requestAccounts' });
    const current = parseInt(await eth.request({ method: 'eth_chainId' }), 16);
    if (current !== C.chainId) {
      try {
        await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hex(C.chainId) }] });
      } catch (err) {
        if (err.code !== 4902) throw err;
        await eth.request({ method: 'wallet_addEthereumChain', params: [{ chainId: hex(C.chainId), chainName: C.chainName, rpcUrls: [C.rpc], nativeCurrency: C.currency, blockExplorerUrls: [C.explorer] }] });
      }
    }
    eth.on?.('accountsChanged', () => location.reload());
    eth.on?.('chainChanged', () => location.reload());
    await connected(addr, 'injected');
  }

  async function connected(addr, via) {
    owner = viem.getAddress(addr);
    const chain = viem.defineChain(chainDef(C));
    const pub = viem.createPublicClient({ chain, transport: viem.http(C.rpc, { batch: { batchSize: 50 } }) });
    let wallet;
    if (via === 'reown') {
      const core = kit.WagmiCore;
      // On a restored session AppKit reports the account before wagmi has rehydrated the connector.
      for (let i = 0; core.getAccount(adapter.wagmiConfig).status !== 'connected' && i < 80; i++) await new Promise((r) => setTimeout(r, 250));
      if (core.getChainId(adapter.wagmiConfig) !== C.chainId) await core.switchChain(adapter.wagmiConfig, { chainId: C.chainId });
      wallet = await core.getWalletClient(adapter.wagmiConfig, { chainId: C.chainId });
      modal.close();
    } else {
      wallet = viem.createWalletClient({ chain, transport: viem.custom(window.ethereum), account: owner });
    }
    await onConnected({ owner, pub, wallet });
  }

  async function connect() {
    if (owner && modal) return modal.open();
    let opened = null;
    try { opened = await setupAppKit(); } catch (err) { console.warn('Reown did not load, using an injected wallet', err); }
    if (!opened) return connectInjected();
    const status = kit.WagmiCore.getAccount(adapter.wagmiConfig).status;
    if (status === 'connected') return;
    if (status === 'reconnecting') { wantModal = true; return; }
    opened.open();
  }

  function restore() {
    let had = false;
    try { had = localStorage.getItem('@appkit/connection_status') === 'connected'; } catch {}
    if (had) setupAppKit().catch((err) => console.warn('Reown session did not restore', err));
  }

  return { connect, restore, get owner() { return owner; } };
}
