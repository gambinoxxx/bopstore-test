import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'

// Helper function to compare cart equality
const areCartsEqual = (cart1, cart2) => {
  if (!cart1 || !cart2) return false
  const keys1 = Object.keys(cart1)
  const keys2 = Object.keys(cart2)
  if (keys1.length !== keys2.length) return false
  
  return keys1.every(key => cart1[key] === cart2[key])
}

export const uploadCart = createAsyncThunk('cart/uploadCart',
  async ({ getToken }, thunkApi) => {
    try {
      const { cartItems, lastUploadedCart } = thunkApi.getState().cart
      
      // Skip upload if cart hasn't changed since last upload
      if (lastUploadedCart && areCartsEqual(cartItems, lastUploadedCart)) {
        console.log('🔄 Cart unchanged, skipping upload')
        return { cart: cartItems, skipped: true }
      }
      
      console.log('📦 Uploading cart to server:', cartItems)
      
      const token = await getToken()
      
      const response = await axios.post('/api/cart', 
        { cart: cartItems }, 
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          timeout: 5000
        }
      )
      
      console.log('✅ Cart uploaded successfully')
      return { ...response.data, skipped: false }
      
    } catch (error) {
      console.error('❌ Cart upload failed:', error.response?.data || error.message)
      
      // Don't fail the thunk - just return current cart
      const { cartItems } = thunkApi.getState().cart
      return { 
        cart: cartItems,
        error: error.response?.data?.error || error.message,
        skipped: false
      }
    }
  }
)

export const fetchCart = createAsyncThunk('cart/fetchCart',
  async ({ getToken }, thunkApi) => {
    try {
      const token = await getToken()
      const { data } = await axios.get('/api/cart', {
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 5000
      })
      
      console.log('📦 Cart fetched from server:', data)
      return data
      
    } catch (error) {
      console.error('❌ Cart fetch failed:', error.response?.data || error.message)
      
      return { 
        cart: {},
        error: error.response?.data?.error || 'Failed to fetch cart'
      }
    }
  }
)

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    total: 0,
    cartItems: {},
    loading: false,
    error: null,
    lastSynced: null,
    lastUploadedCart: null, // Track last uploaded cart to prevent duplicate uploads
    isInitialized: false // Track if cart has been loaded from server
  },
  reducers: {
    addToCart: (state, action) => {
      const { productId, quantity = 1 } = action.payload
      
      const currentQty = state.cartItems[productId] || 0
      state.cartItems[productId] = currentQty + quantity
      
      state.total = Object.values(state.cartItems).reduce((sum, qty) => sum + qty, 0)
    },
    
    removeFromCart: (state, action) => {
      const { productId, quantity = 1 } = action.payload
      
      if (state.cartItems[productId]) {
        const newQuantity = state.cartItems[productId] - quantity
        
        if (newQuantity <= 0) {
          delete state.cartItems[productId]
        } else {
          state.cartItems[productId] = newQuantity
        }
        
        state.total = Object.values(state.cartItems).reduce((sum, qty) => sum + qty, 0)
      }
    },
    
    deleteItemFromCart: (state, action) => {
      const { productId } = action.payload
      
      if (state.cartItems[productId]) {
        delete state.cartItems[productId]
        state.total = Object.values(state.cartItems).reduce((sum, qty) => sum + qty, 0)
      }
    },
    
    clearCart: (state) => {
      state.cartItems = {}
      state.total = 0
    },
    
    setCart: (state, action) => {
      const { cartItems } = action.payload
      state.cartItems = cartItems || {}
      state.total = Object.values(cartItems || {}).reduce((sum, qty) => sum + qty, 0)
      state.lastSynced = new Date().toISOString()
      state.isInitialized = true
    },
    
    resetCart: (state) => {
      state.cartItems = {}
      state.total = 0
      state.lastSynced = null
      state.lastUploadedCart = null
      state.isInitialized = false
      state.error = null
    }
  },
  extraReducers: (builder) => {
    // Upload Cart
    builder.addCase(uploadCart.pending, (state) => {
      state.loading = true
      state.error = null
    })
    
    builder.addCase(uploadCart.fulfilled, (state, action) => {
      state.loading = false
      state.lastSynced = new Date().toISOString()
      
      // Only update lastUploadedCart if we actually uploaded (not skipped)
      if (!action.payload.skipped) {
        state.lastUploadedCart = { ...action.payload.cart }
      }
      
      // If server returned a different cart, update local state
      if (action.payload.cart && typeof action.payload.cart === 'object') {
        state.cartItems = action.payload.cart
        state.total = Object.values(action.payload.cart).reduce((sum, qty) => sum + qty, 0)
      }
    })
    
    builder.addCase(uploadCart.rejected, (state, action) => {
      state.loading = false
      state.error = action.error?.message || 'Failed to upload cart'
    })
    
    // Fetch Cart
    builder.addCase(fetchCart.pending, (state) => {
      state.loading = true
      state.error = null
    })
    
    builder.addCase(fetchCart.fulfilled, (state, action) => {
      state.loading = false
      state.isInitialized = true
      
      if (action.payload.cart && typeof action.payload.cart === 'object') {
        state.cartItems = action.payload.cart
        state.lastUploadedCart = { ...action.payload.cart } // Store what we fetched
        state.total = Object.values(action.payload.cart).reduce((sum, qty) => sum + qty, 0)
        state.lastSynced = new Date().toISOString()
      }
    })
    
    builder.addCase(fetchCart.rejected, (state, action) => {
      state.loading = false
      state.isInitialized = true // Still mark as initialized even if fetch failed
      state.error = action.error?.message || 'Failed to fetch cart'
    })
  }
})

export const { 
  addToCart, 
  removeFromCart, 
  clearCart, 
  deleteItemFromCart,
  setCart,
  resetCart
} = cartSlice.actions

export default cartSlice.reducer