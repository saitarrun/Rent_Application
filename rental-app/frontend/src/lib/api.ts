import axios from 'axios';
import { useAppStore } from '../store/useAppStore';

const baseURL = import.meta.env.VITE_API_BASE || '/api';

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = useAppStore.getState().token;
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function requestNonce(payload: { address: string; role: 'owner' | 'tenant'; email?: string }) {
  const { data } = await api.post('/auth/nonce', payload);
  return data;
}

export async function verifyWallet(payload: { address: string; signature: string }) {
  const { data } = await api.post('/auth/verify', payload);
  useAppStore.getState().setToken(data.token);
  useAppStore.getState().setUser(data.user);
  useAppStore.getState().setWallet(payload.address);
  return data;
}

export async function fetchLeases() {
  const { data } = await api.get('/leases');
  return data;
}

export async function fetchLease(id: string) {
  const { data } = await api.get(`/leases/${id}`);
  return data;
}

export async function createLease(payload: any) {
  const { data } = await api.post('/leases', payload);
  return data;
}

export async function fetchInvoices(leaseId: string) {
  const { data } = await api.get(`/leases/${leaseId}/invoices`);
  return data;
}

export async function fetchRepairs(leaseId: string) {
  const { data } = await api.get(`/leases/${leaseId}/repairs`);
  return data;
}

export async function createRepair(leaseId: string, payload: any) {
  const { data } = await api.post(`/leases/${leaseId}/repairs`, payload);
  return data;
}

export async function updateRepair(id: string, payload: any) {
  const { data } = await api.patch(`/repairs/${id}`, payload);
  return data;
}

export async function payInit(invoiceId: string) {
  const { data } = await api.post(`/invoices/${invoiceId}/pay-init`, {});
  return data;
}

export async function reconcile(invoiceId: string, payload: any) {
  const { data } = await api.patch(`/invoices/${invoiceId}/reconcile`, payload);
  return data;
}

export async function getProfile() {
  const { data } = await api.get('/profile');
  return data;
}

export async function updateProfile(payload: any) {
  const { data } = await api.put('/profile', payload);
  return data;
}

export async function getLedger(propertyId: string) {
  const { data } = await api.get(`/properties/${propertyId}/ledger`);
  return data;
}

export async function signLease(leaseId: string) {
  const { data } = await api.post(`/leases/${leaseId}/sign`, {});
  return data;
}

export async function toggleAutopay(leaseId: string, autopay: boolean) {
  const { data } = await api.patch(`/leases/${leaseId}/autopay`, { autopay });
  return data;
}

export async function fetchListings(params?: { city?: string; available?: boolean }) {
  const { data } = await api.get('/listings', { params });
  return data;
}

export async function refreshListings() {
  const { data } = await api.post('/listings/refresh', {});
  return data;
}

export async function submitApplication(payload: { listingId: string; message?: string; phone?: string }) {
  const { data } = await api.post('/applications', payload);
  return data;
}

export async function fetchApplications() {
  const { data } = await api.get('/applications');
  return data;
}

export async function updateApplicationStatus(id: string, status: string) {
  const { data } = await api.patch(`/applications/${id}`, { status });
  return data;
}
