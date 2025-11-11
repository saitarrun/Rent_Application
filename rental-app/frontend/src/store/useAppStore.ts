import { create } from 'zustand';

export type Environment = 'local' | 'sepolia';

type Notice = {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
};

interface UserState {
  id: string;
  email: string;
  role: 'owner' | 'tenant' | 'admin';
  ethAddr?: string | null;
}

interface AppState {
  token?: string;
  user?: UserState;
  wallet?: string;
  environment: Environment;
  notices: Notice[];
  setToken: (token?: string) => void;
  setUser: (user?: UserState) => void;
  setWallet: (wallet?: string) => void;
  setEnvironment: (env: Environment) => void;
  pushNotice: (type: Notice['type'], message: string) => void;
  dismissNotice: (id: string) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
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
