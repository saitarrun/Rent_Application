import { create } from 'zustand';
export const useAppStore = create((set, get) => ({
    token: null,
    role: null,
    environment: 'local',
    notices: [],
    setToken: (token) => set({ token }),
    setRole: (role) => set({ role }),
    setUser: (user) => set({ user }),
    setWallet: (wallet) => set({ wallet }),
    setEnvironment: (environment) => set({ environment }),
    pushNotice: (type, message) => {
        const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
        set({ notices: [...get().notices, { id, type, message }] });
    },
    dismissNotice: (id) => set({ notices: get().notices.filter((notice) => notice.id !== id) }),
    logout: () => set({ token: null, role: null, user: undefined, wallet: undefined, notices: [] })
}));
