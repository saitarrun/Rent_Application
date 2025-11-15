import { ethers } from 'ethers';
import PaymentsArtifact from '../abi/Payments.json';
import RentArtifact from '../abi/RENT.json';
import { getNetwork } from './env';
let contractsCache = null;
async function loadContracts() {
    if (contractsCache)
        return contractsCache;
    const res = await fetch('/contracts.json');
    if (!res.ok)
        throw new Error('contracts.json unavailable');
    contractsCache = await res.json();
    return contractsCache;
}
export async function ensureNetwork(env) {
    const network = getNetwork(env);
    const provider = window.ethereum;
    if (!provider)
        throw new Error('Wallet not detected');
    try {
        await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: network.chainHex }] });
    }
    catch (error) {
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
        }
        else {
            throw error;
        }
    }
}
function leaseKey(leaseId) {
    return BigInt(ethers.id(leaseId));
}
export async function payInvoiceOnChain(leaseId, invoice, env) {
    await ensureNetwork(env);
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const network = getNetwork(env);
    const contracts = await loadContracts();
    const addresses = contracts[network.chainId];
    if (!addresses?.Payments)
        throw new Error('Payments contract missing for env');
    const paymentsAbi = PaymentsArtifact.abi ?? PaymentsArtifact;
    const payments = new ethers.Contract(addresses.Payments, paymentsAbi, signer);
    const wei = ethers.parseEther(invoice.amountEth.toString());
    const startUnix = BigInt(Math.floor(new Date(invoice.periodStartISO).getTime() / 1000));
    const endUnix = BigInt(Math.floor(new Date(invoice.periodEndISO).getTime() / 1000));
    const tx = await payments.payRent(leaseKey(leaseId), startUnix, endUnix, wei, { value: wei });
    const receipt = await tx.wait();
    return receipt.hash ?? tx.hash;
}
async function resolveContractAddress(chainId) {
    const contracts = await loadContracts();
    const key = typeof chainId === 'number'
        ? chainId.toString()
        : chainId || Object.keys(contracts)[0];
    const entry = contracts[key];
    if (!entry?.RENT)
        throw new Error('RENT contract address missing');
    return entry.RENT;
}
export async function getRentContract(providerOrSigner) {
    let provider;
    if (providerOrSigner && 'provider' in providerOrSigner) {
        provider = providerOrSigner.provider ?? undefined;
    }
    else if (providerOrSigner) {
        provider = providerOrSigner;
    }
    if (!provider) {
        provider = new ethers.BrowserProvider(window.ethereum);
    }
    const network = typeof provider.getNetwork === 'function'
        ? await provider.getNetwork()
        : undefined;
    const address = await resolveContractAddress(network?.chainId ? Number(network.chainId) : undefined);
    const rentAbi = RentArtifact.abi ?? RentArtifact;
    return new ethers.Contract(address, rentAbi, providerOrSigner ?? provider);
}
function normalizeLeaseId(leaseId) {
    return typeof leaseId === 'string' ? BigInt(leaseId) : BigInt(leaseId);
}
export async function payDeposit(leaseId, depositEth) {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = await getRentContract(signer);
    const tx = await contract.payDeposit(normalizeLeaseId(leaseId), {
        value: ethers.parseEther(depositEth)
    });
    const receipt = await tx.wait();
    return receipt.hash ?? tx.hash;
}
export async function payAnnual(leaseId, annualRentEth) {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = await getRentContract(signer);
    const tx = await contract.payAnnualRent(normalizeLeaseId(leaseId), {
        value: ethers.parseEther(annualRentEth)
    });
    const receipt = await tx.wait();
    return receipt.hash ?? tx.hash;
}
