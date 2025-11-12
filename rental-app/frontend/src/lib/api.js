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
export async function requestNonce(payload) {
    const { data } = await api.post('/auth/nonce', payload);
    return data;
}
export async function verifyWallet(payload) {
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
export async function fetchLease(id) {
    const { data } = await api.get(`/leases/${id}`);
    return data;
}
export async function createLease(payload) {
    const { data } = await api.post('/leases', payload);
    return data;
}
export async function fetchInvoices(leaseId) {
    const { data } = await api.get(`/leases/${leaseId}/invoices`);
    return data;
}
export async function fetchRepairs(leaseId) {
    const { data } = await api.get(`/leases/${leaseId}/repairs`);
    return data;
}
export async function createRepair(leaseId, payload) {
    const { data } = await api.post(`/leases/${leaseId}/repairs`, payload);
    return data;
}
export async function updateRepair(id, payload) {
    const { data } = await api.patch(`/repairs/${id}`, payload);
    return data;
}
export async function payInit(invoiceId) {
    const { data } = await api.post(`/invoices/${invoiceId}/pay-init`, {});
    return data;
}
export async function reconcile(invoiceId, payload) {
    const { data } = await api.patch(`/invoices/${invoiceId}/reconcile`, payload);
    return data;
}
export async function getProfile() {
    const { data } = await api.get('/profile');
    return data;
}
export async function updateProfile(payload) {
    const { data } = await api.put('/profile', payload);
    return data;
}
export async function getLedger(propertyId) {
    const { data } = await api.get(`/properties/${propertyId}/ledger`);
    return data;
}
export async function signLease(leaseId) {
    const { data } = await api.post(`/leases/${leaseId}/sign`, {});
    return data;
}
export async function toggleAutopay(leaseId, autopay) {
    const { data } = await api.patch(`/leases/${leaseId}/autopay`, { autopay });
    return data;
}
export async function fetchListings(params) {
    const { data } = await api.get('/listings', { params });
    return data;
}
export async function refreshListings() {
    const { data } = await api.post('/listings/refresh', {});
    return data;
}
export async function submitApplication(payload) {
    const { data } = await api.post('/applications', payload);
    return data;
}
export async function fetchApplications() {
    const { data } = await api.get('/applications');
    return data;
}
export async function updateApplicationStatus(id, status) {
    const { data } = await api.patch(`/applications/${id}`, { status });
    return data;
}
