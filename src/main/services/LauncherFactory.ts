import { ILauncherService } from "../interfaces/ILauncherService";

export class LauncherFactory {
  private services: Map<string, ILauncherService> = new Map();

  constructor(services: ILauncherService[]) {
    services.forEach((s) => this.registerService(s));
  }

  public registerService(service: ILauncherService) {
    this.services.set(service.id, service);
  }

  public getService(launcherId: string): ILauncherService {
    const service = this.services.get(launcherId);
    if (!service) {
      throw new Error(`Launcher service not support: ${launcherId}`);
    }
    return service;
  }
}
