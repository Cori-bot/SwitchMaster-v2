export const state = {
  accounts: [],
  appConfig: {},
  currentPinInput: "",
  isSettingPin: false,
  confirmPin: "",
  pendingGameType: null,
  pendingAccountId: null,
  pendingDeleteAccountId: null,
};

export const constants = {
  NOTIFICATION_DISPLAY_TIME_MS: 3000,
  SETTINGS_AUTOSAVE_DELAY_MS: 500,
  PIN_PROCESS_DELAY_MS: 100,
  PIN_ERROR_RESET_DELAY_MS: 1000,
  ERROR_SHAKE_DELAY_MS: 1000,
  VIEW_SWITCH_TRANSITION_DELAY_MS: 200,
  CURRENT_APP_VERSION: "2.4.3",
  PIN_LENGTH: 4,
};
