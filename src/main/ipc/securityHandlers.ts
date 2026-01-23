import { safeHandle } from "./utils";
import { SecurityService } from "../services/SecurityService";

export function registerSecurityHandlers(securityService: SecurityService) {
  safeHandle("verify-pin", async (_e, pin) => {
    return await securityService.verifyPin(pin as string);
  });

  safeHandle("set-pin", async (_e, pin) => {
    return await securityService.setPin(pin as string);
  });

  safeHandle("disable-pin", async (_e, pin) => {
    return await securityService.disablePin(pin as string);
  });

  safeHandle("get-security-status", () => {
    return securityService.isEnabled();
  });
}
