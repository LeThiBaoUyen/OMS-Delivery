import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { login } from '../api/client';

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [username, setUsername] = useState('shipper');
  const [password, setPassword] = useState('Shipper123');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      await login(username, password);
      navigation.replace('Orders');
    } catch (err: any) {
      Alert.alert('Đăng nhập thất bại', err.message || 'Kiểm tra thông tin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.wrapper} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <Text style={styles.brand}>OMS Delivery</Text>
          <Text style={styles.subtitle}>Giao hàng — nhanh, an toàn</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Đăng nhập</Text>

          <Text style={styles.label}>Tên đăng nhập</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="shipper"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
            accessibilityLabel="username"
          />

          <Text style={styles.label}>Mật khẩu</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            accessibilityLabel="password"
          />

          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Đăng nhập</Text>}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.hint}>Dùng thử: shipper / Shipper123</Text>
            <TouchableOpacity onPress={() => Alert.alert('Quên mật khẩu', 'Liên hệ admin để lấy lại mật khẩu.')}> 
              <Text style={styles.forgot}>Quên mật khẩu?</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f3f6fb' },
  wrapper: { flex: 1, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 24 },
  brand: { fontSize: 28, fontWeight: '700', color: '#0b57d0' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 4 },
  cardTitle: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  label: { fontSize: 13, color: '#374151', marginTop: 8, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e6e9ef', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, fontSize: 16, backgroundColor: '#fbfdff' },
  button: { marginTop: 16, backgroundColor: '#0b57d0', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  footerRow: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hint: { color: '#6b7280', fontSize: 12 },
  forgot: { color: '#0b57d0', fontSize: 13 },
});

export default LoginScreen;
