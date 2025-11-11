import { ethers } from 'ethers';
import PaymentsAbi from '../abi/Payments.json';
import { getNetwork } from './env';
import type { Environment } from '../store/useAppStore';

let contractsCache: Record<string, any> | null = null;

async function loadContracts() {
  if (contractsCache) return contractsCache;
  const res = await fetch('/contracts.json');
  if (!res.ok) throw new Error('contracts.json unavailable');
  contractsCache = await res.json();
  return contractsCache;
}

export async function ensureNetwork(env: Environment) {
  const network = getNetwork(env);
  const provider = (window as any).ethereum;
  if (!provider) throw new Error('Wallet not detected');
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: network.chainHex }] });
  } catch (error: any) {
    if (error.code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: network.chainHex,
            rpcUrls: [network.rpcUrl],
            chainName: network.label,
            nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 }
          }
        ]
      });
    } else {
      throw error;
    }
  }
}

function leaseKey(leaseId: string) {
  return BigInt(ethers.id(leaseId));
}

export async function payInvoiceOnChain(
  leaseId: string,
  invoice: { amountEth: string; periodStartISO: string; periodEndISO: string },
  env: Environment
) {
  await ensureNetwork(env);
  const provider = new ethers.BrowserProvider((window as any).ethereum);
  const signer = await provider.getSigner();
  const network = getNetwork(env);
  const contracts = await loadContracts();
  const addresses = contracts[network.chainId];
  if (!addresses?.Payments) throw new Error('Payments contract missing for env');
  const payments = new ethers.Contract(addresses.Payments, PaymentsAbi, signer);
  const wei = ethers.parseEther(invoice.amountEth.toString());
  const startUnix = BigInt(Math.floor(new Date(invoice.periodStartISO).getTime() / 1000));
  const endUnix = BigInt(Math.floor(new Date(invoice.periodEndISO).getTime() / 1000));
  const tx = await payments.payRent(leaseKey(leaseId), startUnix, endUnix, wei, { value: wei });
  const receipt = await tx.wait();
  return receipt.hash ?? tx.hash;
}
