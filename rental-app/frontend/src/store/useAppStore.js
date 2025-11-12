import { create } from 'zustand';
export const useAppStore = create((set, get) => ({
    environment: 'local',
    notices: [],
    setToken: (token) => set({ token }),
    setUser: (user) => set({ user }),
    setWallet: (wallet) => set({ wallet }),
    setEnvironment: (environment) => set({ environment }),
    pushNotice: (type, message) => {
        const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
        set({ notices: [...get().notices, { id, type, message }] });
    },
    dismissNotice: (id) => set({ notices: get().notices.filter((notice) => notice.id !== id) }),
    logout: () => set({ token: undefined, user: undefined, wallet: undefined })
}));
