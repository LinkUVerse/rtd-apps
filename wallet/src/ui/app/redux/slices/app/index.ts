// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { DEFAULT_API_ENV } from "_app/ApiProvider";
import type { RootState } from "_redux/RootReducer";
import type { API_ENV, NetworkEnvType } from "_src/shared/api-env";
import type { AppThunkConfig } from "_store/thunk-extras";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

import { queryClient } from "../../../helpers/queryClient";
import { AppType } from "./AppType";

type AppState = {
  appType: AppType;
  apiEnv: API_ENV;
  navVisible: boolean;
  customRPC?: string | null;
  customProfile?: import("_src/shared/rpc/profile").WalletNetworkProfile;
  activeOrigin: string | null;
  activeOriginFavIcon: string | null;
};

const initialState: AppState = {
  appType: AppType.unknown,
  apiEnv: DEFAULT_API_ENV,
  customRPC: null,
  navVisible: true,
  activeOrigin: null,
  activeOriginFavIcon: null,
};

export const changeActiveNetwork = createAsyncThunk<
  void,
  { network: NetworkEnvType; store?: boolean },
  AppThunkConfig
>(
  "changeRPCNetwork",
  async ({ network, store = false }, { extra: { background }, dispatch }) => {
    if (store) {
      await background.setActiveNetworkEnv(network);
    }
    queryClient.clear();
    await dispatch(slice.actions.setActiveNetwork(network));
  },
);

const slice = createSlice({
  name: "app",
  reducers: {
    initAppType: (state, { payload }: PayloadAction<AppType>) => {
      state.appType = payload;
    },
    setActiveNetwork: (
      state,
      { payload }: PayloadAction<NetworkEnvType>,
    ) => {
      state.apiEnv = payload.env;
      state.customRPC = payload.customRpcUrl;
      state.customProfile = "profile" in payload ? payload.profile : undefined;
    },
    setNavVisibility: (
      state,
      { payload: isVisible }: PayloadAction<boolean>,
    ) => {
      state.navVisible = isVisible;
    },
    setActiveOrigin: (
      state,
      {
        payload,
      }: PayloadAction<{ origin: string | null; favIcon: string | null }>,
    ) => {
      state.activeOrigin = payload.origin;
      state.activeOriginFavIcon = payload.favIcon;
    },
  },
  initialState,
});

export const { initAppType, setNavVisibility, setActiveOrigin } = slice.actions;
export const getNavIsVisible = ({ app }: RootState) => app.navVisible;

export default slice.reducer;
