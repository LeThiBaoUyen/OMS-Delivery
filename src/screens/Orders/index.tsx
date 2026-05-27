import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getDeliveries, updateDeliveryStatus, Delivery } from '../../api/client';

type TabKey = 'READY_TO_UP' | 'DELIVERING' | 'HISTORY';

type RootStackParamList = {
  Login: undefined;
  Orders: undefined;
  OrderDetail: { delivery: Delivery };
};

type Props = NativeStackScreenProps<RootStackParamList, 'Orders'>;

const tabs: { key: TabKey; label: string }[] = [
  { key: 'READY_TO_UP', label: 'Chờ lấy hàng' },
  { key: 'DELIVERING', label: 'Đang giao' },
  { key: 'HISTORY', label: 'Lịch sử giao' },
];

const OrdersScreen: React.FC<Props> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('READY_TO_UP');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<Delivery[]>([]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data =
        activeTab === 'HISTORY'
          ? [
              ...(await getDeliveries('DELIVERED')),
              ...(await getDeliveries('RETURNED')),
            ]
          : await getDeliveries(activeTab);
      setOrders(data || []);
    } catch (err) {
      console.warn(err);
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
  };

  const handleQuickStatusUpdate = async (item: Delivery) => {
    const nextStatus = item.status === 'READY_TO_UP' ? 'DELIVERING' : 'DELIVERED';
    try {
      await updateDeliveryStatus(item.id, nextStatus);
      await fetchOrders();
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Cập nhật thất bại');
    }
  };

  const renderItem = ({ item }: { item: Delivery }) => (
    <Pressable
      style={styles.card}
      onPress={() => navigation.navigate('OrderDetail', { delivery: item })}
    >
      <Text style={styles.code}>{item.trackingNumber}</Text>
      <Text style={styles.name}>{item.receiverName}</Text>
      <Text style={styles.address}>{item.address}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>COD: {item.codAmount.toLocaleString('vi-VN')}</Text>
        <Text style={styles.status}>{item.status}</Text>
      </View>

      <Pressable style={styles.quickButton} onPress={() => handleQuickStatusUpdate(item)}>
        <Text style={styles.quickButtonText}>
          {item.status === 'READY_TO_UP' ? 'Bắt đầu giao nhanh' : 'Giao thành công nhanh'}
        </Text>
      </Pressable>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tabButton, active && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={orders.length === 0 && styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Không có đơn nào trong tab này.</Text>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb', padding: 12 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tabButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tabButtonActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  tabLabel: { fontSize: 12, fontWeight: '600', color: '#334155', textAlign: 'center' },
  tabLabelActive: { color: '#ffffff' },
  loader: { flex: 1 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  code: { fontSize: 12, fontWeight: '700', color: '#0f766e', marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '700', color: '#111827' },
  address: { fontSize: 13, color: '#475569', marginTop: 6, lineHeight: 18 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, alignItems: 'center' },
  meta: { fontSize: 13, color: '#0f172a', fontWeight: '600' },
  status: { fontSize: 11, fontWeight: '700', color: '#475569', backgroundColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  quickButton: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#0f766e',
  },
  quickButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  emptyText: { textAlign: 'center', color: '#64748b', marginTop: 24 },
});

export default OrdersScreen;
