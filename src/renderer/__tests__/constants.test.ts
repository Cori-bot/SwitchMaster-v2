import { describe, it, expect } from "vitest";
import {
    COLOR_BLUE_600,
    COLOR_BLUE_500,
    COLOR_RED_500,
    COLOR_GRAY_400,
    COLOR_GRAY_500,
    COLOR_WHITE,
    COLOR_BLACK,
    GRADIENT_OPACITY,
    BG_MODAL,
    BORDER_WHITE_5,
} from "../constants/colors";
import {
    TEXT_SIZE_XS,
    TEXT_SIZE_SM,
    TEXT_SIZE_BASE,
    TEXT_SIZE_LG,
    TEXT_SIZE_XL,
} from "../constants/typography";

describe("Color constants", () => {
    it("doit exporter les couleurs correctes", () => {
        expect(COLOR_BLUE_600).toBe("#2563eb");
        expect(COLOR_BLUE_500).toBe("#3b82f6");
        expect(COLOR_RED_500).toBe("#ef4444");
        expect(COLOR_GRAY_400).toBe("#9ca3af");
        expect(COLOR_GRAY_500).toBe("#6b7280");
        expect(COLOR_WHITE).toBe("#ffffff");
        expect(COLOR_BLACK).toBe("#000000");
    });

    it("doit exporter les constantes de style", () => {
        expect(GRADIENT_OPACITY).toBe("0.6");
        expect(BG_MODAL).toBe("bg-[#121212]");
        expect(BORDER_WHITE_5).toBe("border-white/5");
    });
});

describe("Typography constants", () => {
    it("doit exporter les tailles de texte correctes", () => {
        expect(TEXT_SIZE_XS).toBe("text-[10px]");
        expect(TEXT_SIZE_SM).toBe("text-sm");
        expect(TEXT_SIZE_BASE).toBe("text-base");
        expect(TEXT_SIZE_LG).toBe("text-lg");
        expect(TEXT_SIZE_XL).toBe("text-xl");
    });
});
