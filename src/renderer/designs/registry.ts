import { ClassicLayout } from "./classic/ClassicLayout";
import { ModernLayout } from "./modern/ModernLayout";

export const DesignRegistry = {
    classic: ClassicLayout,
    modern: ModernLayout,
};

export type DesignKey = keyof typeof DesignRegistry;
