import { configureStore } from '@reduxjs/toolkit'
import cartReducer from './features/cart/cartSlice'
import productReducer from './features/product/productSlice'
import addressReducer from './features/address/addressSlice'
import ratingReducer from './features/rating/ratingSlice'
import { loadState, saveState } from './storage'

// Load the persisted cart state
const preloadedState = loadState();

export const makeStore = () => {
    const store = configureStore({
        reducer: {
            cart: cartReducer,
            product: productReducer,
            address: addressReducer,
            rating: ratingReducer,
        },
        preloadedState, // Use the loaded state
    })

    // Save the cart state on every change
    store.subscribe(() => {
        saveState({
            cart: store.getState().cart
        });
    });

    return store;
}