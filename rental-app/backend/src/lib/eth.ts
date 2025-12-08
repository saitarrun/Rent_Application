import { ethers } from 'ethers';
import path from 'path';
import fs from 'fs/promises';

type LeaseOnChainParams = {
  ownerWallet: string;
  tenantWallet: string;
  annualRentEth: number;
  depositEth: number;
  startUnix: number;
  endUnix: number;
};

const contractsPath = path.resolve(process.cwd(), '..', 'contracts.json');
const abiPath = path.resolve(process.cwd(), '..', 'frontend', 'src', 'abi', 'RENT.json');
const receiptNftAbiPath = path.resolve(process.cwd(), '..', 'frontend', 'src', 'abi', 'LeaseReceiptNFT.json');
let cachedContracts: Record<string, any> | null = null;
let cachedAbi: ethers.InterfaceAbi | null = null;
let cachedInterface: ethers.Interface | null = null;
let cachedReceiptAbi: ethers.InterfaceAbi | null = null;
let cachedReceiptInterface: ethers.Interface | null = null;

async function loadAbi(): Promise<ethers.InterfaceAbi> {
  if (!cachedAbi) {
    const raw = await fs.readFile(abiPath, 'utf-8');
    const parsed = JSON.parse(raw);
    cachedAbi = Array.isArray(parsed) ? parsed : parsed.abi ?? parsed;
    cachedInterface = new ethers.Interface(cachedAbi as ethers.InterfaceAbi);
  }
  return cachedAbi!;
}

async function loadReceiptAbi(): Promise<ethers.InterfaceAbi> {
  if (!cachedReceiptAbi) {
    const raw = await fs.readFile(receiptNftAbiPath, 'utf-8');
    const parsed = JSON.parse(raw);
    cachedReceiptAbi = Array.isArray(parsed) ? parsed : parsed.abi ?? parsed;
    cachedReceiptInterface = new ethers.Interface(cachedReceiptAbi as ethers.InterfaceAbi);
  }
  return cachedReceiptAbi!;
}

async function loadContracts(): Promise<Record<string, any>> {
  if (!cachedContracts) {
    const raw = await fs.readFile(contractsPath, 'utf-8');
    cachedContracts = JSON.parse(raw);
  }
  return cachedContracts!;
}

function getChainConfig() {
  return {
    rpc: process.env.SEPOLIA_RPC || process.env.CHAIN_RPC_URL || 'http://127.0.0.1:8545',
    chainId: process.env.CHAIN_ID || '1337'
  };
}

async function getRentContract() {
  const { rpc, chainId } = getChainConfig();
  const provider = new ethers.JsonRpcProvider(rpc);
  const key = process.env.PRIVATE_KEY;
  if (!key) throw new Error('PRIVATE_KEY missing');
  const signer = new ethers.Wallet(key, provider);
  const contracts = await loadContracts();
  const addr = contracts?.[chainId]?.RENT;
  if (!addr) throw new Error(`RENT address missing for chain ${chainId}`);
  const abi = await loadAbi();
  return { contract: new ethers.Contract(addr, abi, signer), chainId };
}

async function getReceiptNftContract() {
  const rpc = process.env.CHAIN_RPC_URL || 'http://127.0.0.1:8545';
  const chainId = process.env.CHAIN_ID || '1337';
  const addr = process.env.RECEIPT_NFT_ADDRESS;
  const minterKey = process.env.LEASE_NFT_MINTER_PK || process.env.PRIVATE_KEY;
  if (!addr) throw new Error('RECEIPT_NFT_ADDRESS missing');
  if (!minterKey) throw new Error('LEASE_NFT_MINTER_PK missing');
  const provider = new ethers.JsonRpcProvider(rpc);
  const signer = new ethers.Wallet(minterKey, provider);
  const abi = await loadReceiptAbi();
  return {
    contract: new ethers.Contract(addr, abi, signer),
    chainId,
    iface: cachedReceiptInterface
  };
}

export async function createLeaseOnChain(params: LeaseOnChainParams) {
  await loadAbi(); // ensure interface is ready for log parsing
  const { ownerWallet, tenantWallet, annualRentEth, depositEth, startUnix, endUnix } = params;
  if (!ownerWallet) {
    throw new Error('Owner wallet required for lease creation');
  }
  const normalizedOwner = ethers.getAddress(ownerWallet);
  const normalizedTenant = ethers.getAddress(tenantWallet);
  const { contract, chainId } = await getRentContract();
  const anticipatedLeaseId = Number(await contract.nextLeaseId());
  const rentWei = ethers.parseEther(annualRentEth.toString());
  const depositWei = ethers.parseEther(depositEth.toString());
  const tx = await contract.createLease(normalizedTenant, rentWei, depositWei, BigInt(startUnix), BigInt(endUnix));
  const receipt = await tx.wait();
  let chainLeaseId = 0;
  if (receipt?.logs && cachedInterface) {
    for (const log of receipt.logs) {
      try {
        const parsed = cachedInterface.parseLog(log);
        if (parsed?.name === 'LeaseCreated') {
          chainLeaseId = Number(parsed?.args?.id);
          break;
        }
      } catch {
        continue;
      }
    }
  }
  if (!chainLeaseId && Number.isFinite(anticipatedLeaseId)) {
    chainLeaseId = anticipatedLeaseId;
  }
  if (!chainLeaseId) {
    const current = Number(await contract.nextLeaseId());
    if (Number.isFinite(current) && current > 0) {
      chainLeaseId = current - 1;
    }
  }
  if (!Number.isFinite(chainLeaseId)) throw new Error('LeaseCreated event not found');
  await contract.transferLeaseOwner(BigInt(chainLeaseId), normalizedOwner);
  return { chainLeaseId, txHash: receipt!.hash, chainId };
}

export async function signLeaseOnChain(chainLeaseId: number, tenantWallet?: string) {
  const { rpc, chainId } = getChainConfig();
  const provider = new ethers.JsonRpcProvider(rpc);

  let signer: ethers.Signer | null = null;
  const tenantKey = process.env.TENANT_PRIVATE_KEY;
  if (tenantKey) {
    signer = new ethers.Wallet(tenantKey, provider);
  } else if (tenantWallet) {
    try {
      signer = await provider.getSigner(tenantWallet);
    } catch (err) {
      throw new Error(
        'Unable to access tenant signer from RPC. Provide TENANT_PRIVATE_KEY or run on an unlocked local node.'
      );
    }
  }

  if (!signer) {
    throw new Error('Tenant signer unavailable. Set TENANT_PRIVATE_KEY or supply tenant wallet.');
  }

  const contracts = await loadContracts();
  const addr = contracts?.[chainId]?.RENT;
  if (!addr) throw new Error(`RENT address missing for chain ${chainId}`);
  const abi = await loadAbi();
  const contract = new ethers.Contract(addr, abi, signer);
  const tx = await contract.signLease(BigInt(chainLeaseId));
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

export async function mintLeaseReceipt(params: { leaseId: string | number; recipientAddress: string; metadataUri: string }) {
  const { leaseId, recipientAddress, metadataUri } = params;
  const normalizedRecipient = ethers.getAddress(recipientAddress);
  const { contract, chainId, iface } = await getReceiptNftContract();
  let anticipatedId: any = null;
  try {
    const fn = contract.getFunction('safeMint');
    anticipatedId = await fn.staticCall(normalizedRecipient, metadataUri);
  } catch {
    anticipatedId = null;
  }
  const tx = await contract.safeMint(normalizedRecipient, metadataUri);
  const receipt = await tx.wait();

  let tokenId: string | null = null;
  if (receipt?.logs && iface) {
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === 'Transfer') {
          const id = parsed?.args?.tokenId ?? parsed?.args?.[2];
          if (id !== undefined) {
            tokenId = id.toString();
            break;
          }
        }
      } catch {
        continue;
      }
    }
  }

  if (!tokenId && anticipatedId !== undefined && anticipatedId !== null) {
    tokenId = anticipatedId.toString();
  }

  return { tokenId: tokenId ?? null, txHash: receipt.hash, chainId, leaseId };
}

function parseEvent(receipt: ethers.ContractTransactionReceipt | null, eventName: string) {
  if (!receipt || !cachedInterface) return null;
  for (const log of receipt.logs) {
    try {
      const parsed = cachedInterface.parseLog(log);
      if (parsed?.name === eventName) {
        return parsed.args;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export async function requestRepairOnChain(leaseId: number, title: string, costEth?: number) {
  const { contract } = await getRentContract();
  const value = typeof costEth === 'number' ? ethers.parseEther(costEth.toString()) : 0n;
  const tx = await contract.requestRepair(BigInt(leaseId), title, value);
  const receipt = await tx.wait();
  const args = parseEvent(receipt, 'RepairRequested');
  const reqId = args?.reqId ? String(args.reqId) : undefined;
  return { txHash: receipt.hash, reqId };
}

export async function closeLeaseOnChain(chainLeaseId: number) {
  const { contract, chainId } = await getRentContract();
  const tx = await contract.closeLease(BigInt(chainLeaseId));
  const receipt = await tx.wait();
  return { txHash: receipt.hash, chainId };
}

export async function setRepairStatusOnChain(leaseId: number, reqId: string, status: string) {
  const { contract } = await getRentContract();
  const tx = await contract.setRepairStatus(BigInt(leaseId), reqId, status);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}
