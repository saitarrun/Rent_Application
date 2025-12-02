import { create } from 'zustand';

export type Environment = 'local' | 'sepolia';

export type Notice = {
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
  token: string | null;
  role: 'owner' | 'tenant' | null;
  user?: UserState;
  wallet?: string;
  environment: Environment;
  notices: Notice[];
  onboardingCompleted: Set<string>;
  setToken: (token: string | null) => void;
  setRole: (role: 'owner' | 'tenant' | null) => void;
  setUser: (user?: UserState) => void;
  setWallet: (wallet?: string) => void;
  setEnvironment: (env: Environment) => void;
  pushNotice: (type: Notice['type'], message: string) => void;
  dismissNotice: (id: string) => void;
  markOnboardingCompleted: (key: string) => void;
  hasCompletedOnboarding: (key: string) => boolean;
  logout: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  token: null,
  role: null,
  environment: 'local',
  notices: [],
  onboardingCompleted: new Set(),
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
  markOnboardingCompleted: (key) => {
    const updated = new Set(get().onboardingCompleted);
    updated.add(key);
    set({ onboardingCompleted: updated });
  },
  hasCompletedOnboarding: (key) => get().onboardingCompleted.has(key),
  logout: () => set({ token: null, role: null, user: undefined, wallet: undefined, notices: [], onboardingCompleted: new Set() })
}));
