import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const initialState = {
  list: [],
  unreadCount: 0,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

// Thunk to fetch notifications from the backend
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async ({ getToken }, { rejectWithValue }) => {
    try {
      const token = await getToken();
      const response = await axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Thunk to mark a notification as read
export const markNotificationAsRead = createAsyncThunk(
  'notifications/markNotificationAsRead',
  async ({ notificationId, getToken }, { rejectWithValue }) => {
    try {
      const token = await getToken();
      const response = await axios.patch(`/api/notifications/${notificationId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
        state.unreadCount = action.payload.filter(n => n.status === 'UNREAD').length;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const { id } = action.payload;
        const existingNotification = state.list.find(n => n.id === id);
        if (existingNotification && existingNotification.status === 'UNREAD') {
          existingNotification.status = 'READ';
          state.unreadCount--;
        }
      });
  },
});

export default notificationSlice.reducer;