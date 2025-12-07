import { configureStore } from '@reduxjs/toolkit'
import cartReducer from './features/cart/cartSlice'
import productReducer from './features/product/productSlice'
import addressReducer from './features/address/addressSlice'
import ratingReducer from './features/rating/ratingSlice'
import { loadState, saveState } from './storage'
import notificationReducer from './notificationSlice'; // Your new slice


// Load the persisted cart state
const preloadedState = loadState();

export const makeStore = () => {
    const store = configureStore({
        reducer: {
            cart: cartReducer,
            product: productReducer,
            address: addressReducer,
            rating: ratingReducer,
            notifications: notificationReducer, // Add the notifications reducer
        },
        preloadedState, // Use the loaded state
        // The thunk middleware is enabled by default, no special config needed here.
        // We will pass `getToken` directly when dispatching thunks.
    })

    // Save the cart state on every change
    store.subscribe(() => {
        saveState({
            cart: store.getState().cart
        });
    });

    return store;
}