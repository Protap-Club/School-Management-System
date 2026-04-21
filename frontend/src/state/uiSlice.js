// UI Slice - Redux state for UI elements (sidebar, modals, etc.)
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    sidebar: {
        isCollapsed: false,
        isMobileOpen: false,
    },
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        toggleSidebar: (state) => {
            state.sidebar.isCollapsed = !state.sidebar.isCollapsed;
        },
        toggleMobileSidebar: (state) => {
            state.sidebar.isMobileOpen = !state.sidebar.isMobileOpen;
        },
        setSidebarCollapsed: (state, action) => {
            state.sidebar.isCollapsed = action.payload;
        },
        setMobileSidebarOpen: (state, action) => {
            state.sidebar.isMobileOpen = action.payload;
        },
    },
});

export const { toggleSidebar, toggleMobileSidebar, setSidebarCollapsed, setMobileSidebarOpen } = uiSlice.actions;

// Selectors
export const selectSidebarCollapsed = (state) => state.ui.sidebar.isCollapsed;
export const selectMobileSidebarOpen = (state) => state.ui.sidebar.isMobileOpen;

export default uiSlice.reducer;
