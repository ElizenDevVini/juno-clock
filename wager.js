import { C } from './config.js';
import { loadViem, createWallet } from './wallet.js';

const $ = (s) => document.querySelector(s);
const LIVE = Boolean(C.clock);

const CLOCK_ABI = [
  { type: 'function', name: 'score', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'pot', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'totalBurned', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'released', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'burned', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'pending', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'burn', stateMutability: 'nonpayable', inputs: [{ type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'claim', stateMutability: 'nonpayable', inputs: [], outputs: [] },
];
const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ type: 'address' }, { type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
];

let viem, session, decimals = 18;
const fmt = (n, d = decimals, dp = 2) => Number(viem.formatUnits(n, d)).toLocaleString('en-US', { maximumFractionDigits: dp });
const say = (msg) => { $('#w-msg').textContent = msg; };

async function refresh() {
  const { owner, pub } = session;
  const clock = { address: C.clock, abi: CLOCK_ABI };
  const token = { address: C.juno, abi: ERC20_ABI };
  const [bal, burned, pending, total, pot, released] = await Promise.all([
    pub.readContract({ ...token, functionName: 'balanceOf', args: [owner] }),
    pub.readContract({ ...clock, functionName: 'burned', args: [owner] }),
    pub.readContract({ ...clock, functionName: 'pending', args: [owner] }),
    pub.readContract({ ...clock, functionName: 'totalBurned' }),
    pub.readContract({ ...clock, functionName: 'pot' }),
    pub.readContract({ ...clock, functionName: 'released' }),
  ]);
  $('#w-bal').textContent = fmt(bal) + ' JUNO';
  $('#w-burned').textContent = fmt(burned) + ' JUNO';
  $('#w-share').textContent = total > 0n ? (Number(burned * 10000n / total) / 100).toFixed(2) + '%' : '0%';
  $('#w-pending').textContent = fmt(pending, 18, 5) + ' ' + C.currency.symbol;
  $('#w-pot').textContent = fmt(pot, 18, 4) + ' ' + C.currency.symbol;
  $('#w-released').textContent = fmt(released, 18, 4) + ' ' + C.currency.symbol;
  $('#w-claim').disabled = pending === 0n;
}

async function burn() {
  const { owner, pub, wallet } = session;
  const amount = viem.parseUnits($('#w-amount').value || '0', decimals);
  if (amount <= 0n) return say('Enter an amount to burn.');
  const token = { address: C.juno, abi: ERC20_ABI };
  const allowance = await pub.readContract({ ...token, functionName: 'allowance', args: [owner, C.clock] });
  try {
    if (allowance < amount) {
      say('Approve JUNO in your wallet.');
      const h = await wallet.writeContract({ ...token, functionName: 'approve', args: [C.clock, amount], account: owner });
      await pub.waitForTransactionReceipt({ hash: h });
    }
    say('Confirm the burn in your wallet. This cannot be undone.');
    const h = await wallet.writeContract({ address: C.clock, abi: CLOCK_ABI, functionName: 'burn', args: [amount], account: owner });
    await pub.waitForTransactionReceipt({ hash: h });
    say('Burned. Your share updates below.');
    $('#w-amount').value = '';
    await refresh();
  } catch (err) {
    say(err.shortMessage || err.message || 'Transaction failed.');
  }
}

async function claim() {
  const { owner, pub, wallet } = session;
  try {
    const h = await wallet.writeContract({ address: C.clock, abi: CLOCK_ABI, functionName: 'claim', account: owner });
    await pub.waitForTransactionReceipt({ hash: h });
    say('Claimed.');
    await refresh();
  } catch (err) {
    say(err.shortMessage || err.message || 'Transaction failed.');
  }
}

async function main() {
  viem = await loadViem();
  const connector = createWallet({
    viem, C,
    onNoWallet: () => say('No wallet found. Install one or open this page in a wallet browser.'),
    onConnected: async (s) => {
      session = s;
      $('#w-connect').textContent = s.owner.slice(0, 6) + '…' + s.owner.slice(-4);
      $('#w-panel').hidden = false;
      decimals = await s.pub.readContract({ address: C.juno, abi: ERC20_ABI, functionName: 'decimals' });
      if (!LIVE) {
        const bal = await s.pub.readContract({ address: C.juno, abi: ERC20_ABI, functionName: 'balanceOf', args: [s.owner] });
        $('#w-bal').textContent = fmt(bal) + ' JUNO';
        return say('Wallet connected. The clock contract is not deployed yet, so burn and claim are off.');
      }
      $('#w-burn').disabled = false;
      await refresh();
      setInterval(() => refresh().catch(() => {}), 20000);
    },
  });
  $('#w-connect').addEventListener('click', () => connector.connect().catch((err) => say(err.shortMessage || err.message)));
  $('#w-burn').addEventListener('click', burn);
  $('#w-claim').addEventListener('click', claim);
  connector.restore();
}
main();
