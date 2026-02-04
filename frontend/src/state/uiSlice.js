// UI Slice - Redux state for UI elements (sidebar, modals, etc.)
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    sidebar: {
        isCollapsed: false,
    },
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        toggleSidebar: (state) => {
            state.sidebar.isCollapsed = !state.sidebar.isCollapsed;
        },
        setSidebarCollapsed: (state, action) => {
            state.sidebar.isCollapsed = action.payload;
        },
    },
});

export const { toggleSidebar, setSidebarCollapsed } = uiSlice.actions;

// Selectors
export const selectSidebarCollapsed = (state) => state.ui.sidebar.isCollapsed;

export default uiSlice.reducer;
