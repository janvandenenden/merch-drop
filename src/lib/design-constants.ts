// BC 3001 front_large print area: 15" × 18" @ 150 DPI minimum
export const PRINT_INCHES_W = 15;
export const PRINT_INCHES_H = 18;
export const MIN_DPI = 150;
export const MIN_PX_W = PRINT_INCHES_W * MIN_DPI; // 2250
export const MIN_PX_H = PRINT_INCHES_H * MIN_DPI; // 2700

// Print area position on the 1000×1000 t-shirt template (fraction of image size)
export const PRINT_AREA = {
  left: 0.27,
  top: 0.19,
  width: 0.45,
  height: 0.54,
} as const;

// Display size of the t-shirt image inside the modal
export const TSHIRT_DISPLAY = 320;

export type Placement = {
  x: number;
  y: number;
  scale: number;
  rotate: number;
};
