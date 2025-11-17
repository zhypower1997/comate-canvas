// RGBA 转 16 进制颜色函数
export const rgbaToHex = (rgba: { r: number; g: number; b: number; a: number }): string => {
    // 将 0-1 范围的值转换为 0-255 范围
    const r = Math.round(rgba.r * 255);
    const g = Math.round(rgba.g * 255);
    const b = Math.round(rgba.b * 255);

    // 转换为 16 进制并确保是两位数
    const toHex = (value: number) => value.toString(16).padStart(2, '0');

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// RGBA 转数值格式 (0xRRGGBB)
export const rgbaToNumber = (rgba: { r: number; g: number; b: number; a?: number }): number => {
    // 将 0-1 范围的值转换为 0-255 范围
    const r = Math.round(rgba.r * 255);
    const g = Math.round(rgba.g * 255);
    const b = Math.round(rgba.b * 255);
    
    // 返回 0xRRGGBB 格式的数值
    return (r << 16) + (g << 8) + b;
};

// RGB 转数值格式 (0xRRGGBB)
export const rgbToNumber = (r: number, g: number, b: number): number => {
    // 确保值在 0-255 范围内
    const validR = Math.min(255, Math.max(0, Math.round(r)));
    const validG = Math.min(255, Math.max(0, Math.round(g)));
    const validB = Math.min(255, Math.max(0, Math.round(b)));
    
    // 返回 0xRRGGBB 格式的数值
    return (validR << 16) + (validG << 8) + validB;
};

// 字符串颜色转数值格式 (0xRRGGBB)
export const hexToNumber = (hex: string): number => {
    // 去除可能的 # 前缀
    const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
    
    // 将字符串转换为数值
    return parseInt(cleanHex, 16);
};