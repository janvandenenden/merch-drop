import sharp from "sharp";
import { downloadFile, uploadFile, storageKeys } from "./storage";

// Printful BC 3001 front print area spec (px at 150 DPI)
export const PRINT_CANVAS = { width: 1800, height: 2400 } as const;

export type Placement = {
  x: number;
  y: number;
  scale: number;
};

export async function compositePrintFile(
  designKey: string,
  placement: Placement
): Promise<string> {
  const designBuffer = await downloadFile(designKey);

  const designMeta = await sharp(designBuffer).metadata();
  const designWidth = designMeta.width ?? 0;
  const designHeight = designMeta.height ?? 0;

  const scaledWidth = Math.round(designWidth * placement.scale);
  const scaledHeight = Math.round(designHeight * placement.scale);

  const resized = await sharp(designBuffer)
    .resize(scaledWidth, scaledHeight, { fit: "fill" })
    .png()
    .toBuffer();

  const left = Math.round(placement.x);
  const top = Math.round(placement.y);

  const composited = await sharp({
    create: {
      width: PRINT_CANVAS.width,
      height: PRINT_CANVAS.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer();

  const outputKey = storageKeys.printFile(`${Date.now()}.png`);
  await uploadFile(outputKey, composited, "image/png");

  return outputKey;
}
