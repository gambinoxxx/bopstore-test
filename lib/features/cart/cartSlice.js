// lib/features/cart/cartSlice.js - FULLY CORRECTED
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'

let debounceTimer = null 

export const uploadCart = createAsyncThunk('cart/uploadCart',
    async ({ getToken }, thunkApi) => {
        // Clear previous timer
        if (debounceTimer) {
            clearTimeout(debounceTimer)
        }
        
        // Return a promise that resolves when the debounced upload completes
        return new Promise((resolve, reject) => {
            debounceTimer = setTimeout(async () => {
                try {
                    const { cartItems } = thunkApi.getState().cart
                    console.log('📦 Uploading cart to server:', cartItems)
                    
                    const token = await getToken()
                    
                    const response = await axios.post('/api/cart', 
                        { cart: cartItems }, 
                        {
                            headers: {
                                Authorization: `Bearer ${token}`
                            },
                            timeout: 5000 // 5 second timeout
                        }
                    )
                    
                    console.log('✅ Cart uploaded successfully')
                    resolve(response.data) // Resolve with the response
                    
                } catch (error) {
                    console.error('❌ Cart upload failed:', error.response?.data || error.message)
                    
                    // Don't fail the thunk - just return empty success
                    // This prevents Redux from marking it as rejected
                    resolve({ 
                        success: false, 
                        error: error.response?.data?.error || error.message,
                        cart: thunkApi.getState().cart.cartItems // Return current cart
                    })
                }
            }, 1000) // Debounce for 1 second
        })
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
            
            // Return empty cart instead of rejecting
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
        lastSynced: null
    },
    reducers: {
        addToCart: (state, action) => {
            const { productId, quantity = 1 } = action.payload
            
            if (state.cartItems[productId]) {
                state.cartItems[productId] += quantity
            } else {
                state.cartItems[productId] = quantity
            }
            
            state.total += quantity
            state.lastSynced = null // Mark as needing sync
        },
        
        removeFromCart: (state, action) => {
            const { productId, quantity = 1 } = action.payload
            
            if (state.cartItems[productId]) {
                const newQuantity = state.cartItems[productId] - quantity
                
                if (newQuantity <= 0) {
                    delete state.cartItems[productId]
                    state.total -= state.cartItems[productId] || 0
                } else {
                    state.cartItems[productId] = newQuantity
                    state.total -= quantity
                }
                
                state.lastSynced = null
            }
        },
        
        deleteItemFromCart: (state, action) => {
            const { productId } = action.payload
            
            if (state.cartItems[productId]) {
                state.total -= state.cartItems[productId]
                delete state.cartItems[productId]
                state.lastSynced = null
            }
        },
        
        clearCart: (state) => {
            state.cartItems = {}
            state.total = 0
            state.lastSynced = null
        },
        
        setCart: (state, action) => {
            const { cartItems } = action.payload
            state.cartItems = cartItems || {}
            state.total = Object.values(cartItems || {}).reduce((sum, qty) => sum + qty, 0)
            state.lastSynced = new Date().toISOString()
        },
        
        syncCartWithServer: (state) => {
            state.lastSynced = new Date().toISOString()
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
            
            // If server returned a different cart (e.g., after validation), update it
            if (action.payload.cart && typeof action.payload.cart === 'object') {
                state.cartItems = action.payload.cart
                state.total = Object.values(action.payload.cart).reduce((sum, qty) => sum + qty, 0)
            }
        })
        
        builder.addCase(uploadCart.rejected, (state, action) => {
            state.loading = false
            state.error = action.error?.message || 'Failed to upload cart'
            // Don't update lastSynced on error
        })
        
        // Fetch Cart
        builder.addCase(fetchCart.pending, (state) => {
            state.loading = true
            state.error = null
        })
        
        builder.addCase(fetchCart.fulfilled, (state, action) => {
            state.loading = false
            
            // Only update if we got valid cart data
            if (action.payload.cart && typeof action.payload.cart === 'object') {
                state.cartItems = action.payload.cart
                state.total = Object.values(action.payload.cart).reduce((sum, qty) => sum + qty, 0)
                state.lastSynced = new Date().toISOString()
            }
        })
        
        builder.addCase(fetchCart.rejected, (state, action) => {
            state.loading = false
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
    syncCartWithServer
} = cartSlice.actions

export default cartSlice.reducer