import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
  access: string | null;
  refresh: string | null;
}

const initialState: AuthState = {
  access: typeof window !== "undefined" ? localStorage.getItem("access_token") : null,
  refresh: typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setTokens: (
      state,
      action: PayloadAction<{ access: string; refresh: string }>,
    ) => {
      state.access = action.payload.access;
      state.refresh = action.payload.refresh;
      localStorage.setItem("access_token", action.payload.access);
      localStorage.setItem("refresh_token", action.payload.refresh);
    },
    logout: (state) => {
      state.access = null;
      state.refresh = null;
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    },
  },
});

export const { setTokens, logout } = authSlice.actions;
export default authSlice.reducer;
