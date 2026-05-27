# Tài liệu Hướng dẫn Tích hợp & Phát triển Mobile App (OMS Delivery Agent)

---

## 1. Tổng quan Kiến trúc & Tech Stack Khuyến nghị

- **Framework:** React Native (Expo) kết hợp với **TypeScript**.
- **Styling:** NativeWind (Tailwind CSS cho React Native) mang lại giao diện premium, nhất quán, hỗ trợ Dark Mode mượt mà.
- **State Management:** Zustand (Nhẹ, hiệu năng cao hơn Redux cho các ứng dụng quản lý trạng thái tập trung gọn nhẹ).
- **API Client:** Axios đi kèm cơ chế Interceptors để tự động gắn Access Token và xử lý lỗi tập trung.
- **Storage:** Expo SecureStore để mã hóa và lưu trữ JWT Token an toàn trên thiết bị di động.

---

## 2. Bản đồ Luồng Nghiệp vụ của Shipper (State Machine)

Ứng dụng di động sẽ điều khiển trạng thái của Đơn vận chuyển qua 3 giai đoạn chính.

- **READY_TO_UP (Chờ lấy hàng):** Đơn đang nằm ở kho. Giao diện hiển thị nút *"Xác nhận đã lấy hàng"*.
- **DELIVERING (Đang đi giao):** Shipper đang vận chuyển. Giao diện hiển thị 2 nút: *"Giao thành công"* và *"Giao thất bại"*.
- **RETURNED (Giao thất bại):** Shipper bắt buộc phải nhập lý do giao hàng thất bại (`failReason`).

---

## 3. Quy chuẩn Xác thực qua API Gateway

Toàn bộ các request từ thiết bị di động bắt buộc phải đi qua **API Gateway** ở địa chỉ `http://localhost:8888` (hoặc IP mạng nội bộ của máy chủ Back-end khi chạy thực tế trên thiết bị).

### A. Cơ chế Hoạt động của Gateway & JWT

1. Thiết bị gửi thông tin đăng nhập lên Gateway.
2. Gateway chuyển tiếp yêu cầu đến `identity-service` để cấp JWT.
3. Trong JWT Token có chứa claim `accountId` (ở bản demo này là `"shipper_demo"`) và `role` (`"STAFF"`).
4. Đối với mọi request nghiệp vụ tiếp theo, thiết bị gửi header:

```
Authorization: Bearer <YOUR_JWT_TOKEN>
```

5. **Cơ chế ẩn của Gateway:** API Gateway (`AuthenticationFilter.java`) sẽ tự động giải mã JWT này và chuyển tiếp xuống các service nội bộ (`delivery-service`) dưới dạng các Header sau:
   - `X-Account-Id`: shipper_demo
   - `X-User-Role`: STAFF

**IMPORTANT**

không cần tự gửi header `X-Account-Id` khi gọi qua Gateway. Chỉ cần gửi `Authorization: Bearer <TOKEN>`. Gateway sẽ tự động lo phần còn lại một cách an toàn.

---

## 4. Chi tiết Tích hợp API (API Integration Spec)

Dưới đây là đặc tả kỹ thuật chi tiết của tất cả các API mà Mobile App sẽ gọi. Toàn bộ các API đều đã được triển khai, kiểm thử thành công dưới Back-end.

### 4.1. Đăng nhập & Lấy Access Token

- **URL:** `POST http://localhost:8888/api/v1/auth/login`
- **Headers:** `Content-Type: application/json`
- **Request Body:**

```json
{
  "username": "shipper",
  "password": "Shipper123"
}
```

- **Response Body (Thành công - 200 OK):**

```json
{
  "success": true,
  "status": 200,
  "message": "Thành công",
  "result": {
    "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzaGlwcGVyIiwi...",
    "username": "shipper",
    "role": "STAFF"
  }
}
```

- **Xử lý phía FE:** Lưu `result.token` vào `SecureStore`. Nếu thất bại (401), hiển thị thông báo "Tên đăng nhập hoặc mật khẩu không chính xác".

### 4.2. Lấy Danh sách Đơn vận chuyển được giao

- **URL:** `GET http://localhost:8888/api/v1/deliveries/shipper`
- **Headers:**
  - `Authorization: Bearer <TOKEN>`
- **Query Parameters (Tùy chọn):**
  - `status`: Lọc theo trạng thái đơn hàng (ví dụ: `READY_TO_UP`, `DELIVERING`, `DELIVERED`, `RETURNED`).
- **Response Body (Thành công - 200 OK):**

```json
{
  "success": true,
  "status": 200,
  "message": "Thành công",
  "result": [
    {
      "id": "DEL-001",
      "orderId": "ORD-123456",
      "trackingNumber": "OMS-SHIP-7FA3BD90",
      "receiverName": "Nguyễn Văn Cường",
      "receiverPhone": "0987654321",
      "address": "123 Đường Lê Lợi, Phường 5, Quận 3, TP. Hồ Chí Minh",
      "codAmount": 250000.0,
      "shipperId": "shipper_demo",
      "shipperName": "Shipper Demo",
      "shipperPhone": "0988888888",
      "status": "READY_TO_UP",
      "createdAt": "2026-05-27T11:50:00",
      "updatedAt": "2026-05-27T11:50:00"
    }
  ]
}
```

### 4.3. Cập nhật Trạng thái Đơn hàng

- **URL:** `PATCH http://localhost:8888/api/v1/deliveries/{deliveryId}/status`
- **Headers:**
  - `Authorization: Bearer <TOKEN>`
- **Query Parameters:**
  - `status`: Trạng thái mới muốn chuyển đổi (`DELIVERING` | `DELIVERED` | `RETURNED`).
  - `failReason`: Lý do thất bại (URL Encoded, **bắt buộc** nếu `status = RETURNED`).

- **Ví dụ cURL chuyển sang DELIVERING (Đang giao):**

```bash
curl --location --request PATCH 'http://localhost:8888/api/v1/deliveries/DEL-001/status?status=DELIVERING' \
  --header 'Authorization: Bearer <TOKEN>'
```

- **Ví dụ cURL chuyển sang RETURNED (Thất bại):**

```bash
curl --location --request PATCH 'http://localhost:8888/api/v1/deliveries/DEL-001/status?status=RETURNED&failReason=Khach%20hang%20khong%20nghe%20may' \
  --header 'Authorization: Bearer <TOKEN>'
```

- **Response Body (Thành công - 200 OK):**

```json
{
  "success": true,
  "status": 200,
  "message": "Cập nhật trạng thái vận chuyển thành công",
  "result": {
    "id": "DEL-001",
    "status": "DELIVERING",
    "updatedAt": "2026-05-27T11:58:32"
  }
}
```

- **Lưu ý đặc biệt lỗi bảo mật (403/500):** Nếu Shipper A cố tình gửi request cập nhật đơn vận chuyển thuộc về Shipper B, hệ thống sẽ ném về lỗi: FE team cần bắt lỗi này và hiển thị Toast/Alert cảnh báo người dùng.

```json
{
  "success": false,
  "status": 500,
  "message": "Bạn không có quyền cập nhật trạng thái đơn vận chuyển này!"
}
```

---

## 5. Hướng dẫn Viết Axios Client với Interceptors (Code mẫu)

Dưới đây là mã nguồn gợi ý cấu hình Axios Client để xử lý tự động JWT Token, giúp team FE tích hợp cực kỳ nhanh chóng:

```typescript
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = 'http://localhost:8888/api/v1'; // Thay localhost bằng IP Server thực tế khi deploy

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Tự động đính kèm JWT Token vào mọi Request
apiClient.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('user_token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Xử lý tập trung lỗi hết hạn Token hoặc Lỗi Bảo mật
apiClient.interceptors.response.use(
  (response) => {
    return response.data; // Trả về trực tiếp data (ApiResponse dạng JSON)
  },
  async (error) => {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 401) {
        // Token hết hạn hoặc không hợp lệ -> Xóa token và điều hướng về màn hình Login
        await SecureStore.deleteItemAsync('user_token');
        console.warn('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.');
        // Thêm code điều hướng của Router ở đây (ví dụ: navigation.navigate('Login'))
      } else if (status === 403 || status === 500) {
        // Lỗi vi phạm phân quyền
        alert(data.message || 'Bạn không có quyền thực hiện thao tác này!');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## 6. Kế hoạch Phát triển Chi tiết

### Phase 1: Setup Dự án & UI Boilerplate

- Khởi tạo dự án bằng lệnh: `npx create-expo-app OMSDeliveryApp --template tabs-navigation-ts`
- Cấu hình NativeWind để viết CSS nhanh gọn.
- Thiết kế hệ thống Typography và bảng màu premium (Ưu tiên Dark Mode / Sleek Navy & Vibrant Emerald để tăng độ chuyên nghiệp).

### Phase 2: Đăng nhập & Xác thực

- Thiết kế màn hình Đăng nhập (Email, Password).
- Tích hợp Axios Client với Interceptor (như mục 5).
- Đăng nhập với tài khoản test được cấp sẵn (`shipper` / `Shipper123`) và lưu JWT Token.

### Phase 3: Màn hình Danh sách Đơn hàng

- Thiết kế màn hình chính chứa 3 Tab trạng thái:
  1. **Chờ lấy hàng:** Hiển thị danh sách các đơn hàng có trạng thái `READY_TO_UP`.
  2. **Đang giao:** Hiển thị các đơn hàng có trạng thái `DELIVERING`.
  3. **Lịch sử giao:** Hiển thị các đơn hàng có trạng thái `DELIVERED` hoặc `RETURNED`.
- Sử dụng `apiClient.get('/deliveries/shipper?status=...')` để lấy dữ liệu tương ứng cho từng Tab.

### Phase 4: Chi tiết Đơn hàng & Cập nhật Trạng thái

- Thiết kế màn hình Chi tiết Đơn hàng: Tên người nhận, số điện thoại (tích hợp nút gọi điện `linking` của hệ điều hành), địa chỉ chi tiết, số tiền COD phải thu.
- Viết logic hiển thị nút hành động động dựa trên trạng thái đơn hàng:
  - Nếu là `READY_TO_UP`: Hiển thị nút lớn **"Bắt đầu giao hàng"**. Khi bấm -> Gọi API cập nhật trạng thái `DELIVERING`.
  - Nếu là `DELIVERING`: Hiển thị 2 nút:
    - **"Đã giao thành công"**: Gọi API cập nhật trạng thái `DELIVERED`.
    - **"Báo giao thất bại"**: Mở một Modal popup yêu cầu shipper chọn/nhập lý do -> Gửi API cập nhật trạng thái `RETURNED` kèm `failReason`.

### Phase 5: Kiểm thử Tổng thể & Nghiệm thu

- Chạy thử toàn bộ luồng nghiệp vụ trên thiết bị thật (iOS/Android).
- Xác minh việc thay đổi trạng thái trên app sẽ đồng bộ trạng thái đơn hàng về Web Client quản trị của OMS một cách tức thời nhờ luồng RabbitMQ nội bộ dưới Back-end.

---

Nếu bạn muốn, tôi có thể tiếp tục và tạo thêm các file mẫu (ví dụ: `src/api/client.ts` với code Axios, hoặc scaffold dự án Expo). Bạn có muốn tôi tạo các file mẫu đó bây giờ không?
