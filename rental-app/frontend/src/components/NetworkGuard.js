import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { useAppStore } from '../store/useAppStore';
export function NetworkGuard() {
    const { isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();
    const environment = useAppStore((state) => state.environment);
    const expectedChainId = environment === 'local' ? 1337 : 11155111;
    if (!isConnected)
        return null;
    if (chainId === expectedChainId)
        return null;
    return (_jsx("div", { className: "fixed bottom-4 left-1/2 z-50 w-[95%] -translate-x-1/2 rounded-2xl border border-outline bg-surface-2 p-4 shadow-ring sm:w-auto", children: _jsxs("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center", children: [_jsxs("span", { className: "text-sm text-muted", children: ["Wrong network. Please switch to ", environment === 'local' ? 'Ganache (1337)' : 'Sepolia (11155111)', "."] }), _jsx("button", { className: "rounded-xl bg-brand px-3 py-2 text-sm font-medium text-brand-fg hover:bg-brand-hover", onClick: () => switchChain({ chainId: expectedChainId }), children: "Switch network" })] }) }));
}
