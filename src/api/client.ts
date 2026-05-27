import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_BASE_URL = 'http://localhost:8888/api/v1';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

const TOKEN_KEY = 'user_token';

const getStoredToken = async () => {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
};

const setStoredToken = async (token: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
};

const clearStoredToken = async () => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
};

// Request interceptor: attach JWT from SecureStore
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getStoredToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: return data wrapper and handle auth/permission errors
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.response) {
      const { status, data } = error.response;
      if (status === 401) {
        await clearStoredToken();
        console.warn('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.');
      } else if (status === 403 || status === 500) {
        // Surface permission errors to caller
        const message = data?.message || 'Bạn không có quyền thực hiện thao tác này!';
        return Promise.reject(new Error(message));
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// Helper API methods
export type LoginResult = { token: string; username: string; role: string };

export type Delivery = {
  id: string;
  orderId: string;
  trackingNumber: string;
  receiverName: string;
  receiverPhone: string;
  address: string;
  codAmount: number;
  shipperId: string;
  shipperName: string;
  shipperPhone: string;
  status: 'READY_TO_UP' | 'DELIVERING' | 'DELIVERED' | 'RETURNED';
  createdAt: string;
  updatedAt: string;
};

const MOCK_TOKEN = 'mock-shipper-token';

let mockDeliveries: Delivery[] = [
  {
    id: 'DEL-001',
    orderId: 'ORD-123456',
    trackingNumber: 'OMS-SHIP-7FA3BD90',
    receiverName: 'Nguyễn Văn Cường',
    receiverPhone: '0987654321',
    address: '123 Đường Lê Lợi, Phường 5, Quận 3, TP. Hồ Chí Minh',
    codAmount: 250000,
    shipperId: 'shipper_demo',
    shipperName: 'Shipper Demo',
    shipperPhone: '0988888888',
    status: 'READY_TO_UP',
    createdAt: '2026-05-27T11:50:00',
    updatedAt: '2026-05-27T11:50:00',
  },
  {
    id: 'DEL-002',
    orderId: 'ORD-654321',
    trackingNumber: 'OMS-SHIP-AB12CD34',
    receiverName: 'Trần Thị Mai',
    receiverPhone: '0909123456',
    address: '45 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
    codAmount: 180000,
    shipperId: 'shipper_demo',
    shipperName: 'Shipper Demo',
    shipperPhone: '0988888888',
    status: 'DELIVERING',
    createdAt: '2026-05-27T12:10:00',
    updatedAt: '2026-05-27T12:14:00',
  },
];

export const login = async (username: string, password: string): Promise<LoginResult> => {
  try {
    const resp: any = await apiClient.post('/auth/login', { username, password });
    if (resp?.result?.token) {
      await setStoredToken(resp.result.token);
      return resp.result as LoginResult;
    }
    throw new Error(resp?.message || 'Đăng nhập thất bại');
  } catch (error: any) {
    if (!error?.response && username === 'shipper' && password === 'Shipper123') {
      const fallbackResult = { token: MOCK_TOKEN, username: 'shipper', role: 'STAFF' };
      await setStoredToken(fallbackResult.token);
      console.warn('Backend không khả dụng, đang dùng dữ liệu demo cục bộ.');
      return fallbackResult;
    }
    throw error;
  }
};

export const getDeliveries = async (status?: string) => {
  const isMockToken = (await getStoredToken()) === MOCK_TOKEN;
  if (isMockToken) {
    return status ? mockDeliveries.filter((item) => item.status === status) : mockDeliveries;
  }
  try {
    const url = status ? `/deliveries/shipper?status=${encodeURIComponent(status)}` : '/deliveries/shipper';
    const resp: any = await apiClient.get(url);
    return resp.result;
  } catch (error: any) {
    throw error;
  }
};

export const updateDeliveryStatus = async (
  deliveryId: string,
  status: 'DELIVERING' | 'DELIVERED' | 'RETURNED',
  failReason?: string
) => {
  const isMockToken = (await getStoredToken()) === MOCK_TOKEN;
  if (isMockToken) {
    if (status === 'RETURNED' && !failReason) {
      throw new Error('failReason bắt buộc khi chuyển trạng thái sang RETURNED');
    }
    const updatedAt = new Date().toISOString();
    mockDeliveries = mockDeliveries.map((item) =>
      item.id === deliveryId ? { ...item, status, updatedAt } : item
    );
    return { id: deliveryId, status, updatedAt };
  }
  try {
    let url = `/deliveries/${encodeURIComponent(deliveryId)}/status?status=${encodeURIComponent(status)}`;
    if (status === 'RETURNED') {
      if (!failReason) throw new Error('failReason bắt buộc khi chuyển trạng thái sang RETURNED');
      url += `&failReason=${encodeURIComponent(failReason)}`;
    }
    const resp: any = await apiClient.patch(url);
    return resp.result;
  } catch (error: any) {
    throw error;
  }
};
