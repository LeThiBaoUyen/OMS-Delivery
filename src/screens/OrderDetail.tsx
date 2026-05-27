import React, { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Delivery, updateDeliveryStatus } from '../api/client';

type RootStackParamList = {
  Login: undefined;
  Orders: undefined;
  OrderDetail: { delivery: Delivery };
};

type Props = NativeStackScreenProps<RootStackParamList, 'OrderDetail'>;

const OrderDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { delivery: initialDelivery } = route.params;
  const [delivery, setDelivery] = useState(initialDelivery);
  const [modalVisible, setModalVisible] = useState(false);
  const [failReason, setFailReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canStart = delivery.status === 'READY_TO_UP';
  const canDeliver = delivery.status === 'DELIVERING';
  const historyOnly = delivery.status === 'DELIVERED' || delivery.status === 'RETURNED';

  const statusColor = useMemo(() => {
    if (delivery.status === 'READY_TO_UP') return '#0f766e';
    if (delivery.status === 'DELIVERING') return '#2563eb';
    if (delivery.status === 'DELIVERED') return '#16a34a';
    return '#dc2626';
  }, [delivery.status]);

  const handleUpdate = async (
    status: 'DELIVERING' | 'DELIVERED' | 'RETURNED',
    reason?: string
  ) => {
    try {
      setSubmitting(true);
      const result = await updateDeliveryStatus(delivery.id, status, reason);
      setDelivery((current) => ({ ...current, status: result.status, updatedAt: result.updatedAt }));
      setModalVisible(false);
      setFailReason('');
      Alert.alert('Thành công', 'Cập nhật trạng thái vận chuyển thành công');
      if (status !== 'RETURNED') {
        navigation.goBack();
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Cập nhật thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.code}>{delivery.trackingNumber}</Text>
        <Text style={styles.title}>{delivery.receiverName}</Text>
        <Text style={styles.text}>{delivery.address}</Text>
        <Text style={styles.text}>COD: {delivery.codAmount.toLocaleString('vi-VN')} đ</Text>
        <Text style={[styles.status, { color: statusColor }]}>Trạng thái: {delivery.status}</Text>

        <Pressable style={styles.phoneButton} onPress={() => Linking.openURL(`tel:${delivery.receiverPhone}`)}>
          <Text style={styles.phoneButtonText}>Gọi {delivery.receiverPhone}</Text>
        </Pressable>

        {canStart && (
          <Pressable style={styles.primaryButton} onPress={() => handleUpdate('DELIVERING')} disabled={submitting}>
            <Text style={styles.primaryButtonText}>{submitting ? 'Đang xử lý...' : 'Bắt đầu giao hàng'}</Text>
          </Pressable>
        )}

        {canDeliver && (
          <View style={styles.actionRow}>
            <Pressable style={styles.successButton} onPress={() => handleUpdate('DELIVERED')} disabled={submitting}>
              <Text style={styles.actionText}>{submitting ? 'Đang xử lý...' : 'Đã giao thành công'}</Text>
            </Pressable>
            <Pressable style={styles.failButton} onPress={() => setModalVisible(true)} disabled={submitting}>
              <Text style={styles.actionText}>Báo giao thất bại</Text>
            </Pressable>
          </View>
        )}

        {historyOnly && <Text style={styles.historyText}>Đơn đã ở trạng thái lịch sử, không thể cập nhật thêm.</Text>}
      </View>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Lý do giao thất bại</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập lý do thất bại"
              value={failReason}
              onChangeText={setFailReason}
              multiline
            />
            <View style={styles.modalRow}>
              <Pressable style={styles.secondaryButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.actionText}>Hủy</Text>
              </Pressable>
              <Pressable
                style={styles.primaryButtonSmall}
                onPress={() => handleUpdate('RETURNED', failReason)}
                disabled={submitting}
              >
                <Text style={styles.actionText}>{submitting ? 'Đang gửi...' : 'Gửi lý do'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  code: { color: '#0f766e', fontWeight: '800', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  text: { color: '#334155', marginTop: 8, lineHeight: 20 },
  status: { marginTop: 12, fontWeight: '800' },
  phoneButton: { marginTop: 16, backgroundColor: '#0f172a', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  phoneButtonText: { color: '#fff', fontWeight: '700' },
  primaryButton: { marginTop: 16, backgroundColor: '#0f766e', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  successButton: { flex: 1, backgroundColor: '#16a34a', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  failButton: { flex: 1, backgroundColor: '#dc2626', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '800', textAlign: 'center' },
  historyText: { marginTop: 16, color: '#64748b' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  input: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    padding: 12,
    textAlignVertical: 'top',
    color: '#0f172a',
  },
  modalRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  secondaryButton: { flex: 1, backgroundColor: '#475569', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryButtonSmall: { flex: 1, backgroundColor: '#0f766e', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
});

export default OrderDetailScreen;
