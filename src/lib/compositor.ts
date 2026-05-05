import sharp from "sharp";
import { downloadFile, uploadFile, storageKeys } from "./storage";

// Printful BC 3001 front_large print area spec: 15" × 18" at 150 DPI
export const PRINT_CANVAS = { width: 2250, height: 2700 } as const;

export type Placement = {
  x: number;
  y: number;
  scale: number;
  rotate: number;
};

export async function compositePrintFile(
  designKey: string,
  placement: Placement
): Promise<string> {
  const designBuffer = await downloadFile(designKey);

  let workingBuffer = designBuffer;
  if (placement.rotate !== 0) {
    workingBuffer = await sharp(designBuffer).rotate(placement.rotate).toBuffer();
  }

  const designMeta = await sharp(workingBuffer).metadata();
  const designWidth = designMeta.width ?? 0;
  const designHeight = designMeta.height ?? 0;

  const scaledWidth = Math.round(designWidth * placement.scale);
  const scaledHeight = Math.round(designHeight * placement.scale);

  const left = Math.round(placement.x);
  const top = Math.round(placement.y);

  // Compute visible region of the scaled design within the canvas bounds
  const visLeft = Math.max(0, -left);
  const visTop = Math.max(0, -top);
  const visRight = Math.min(scaledWidth, PRINT_CANVAS.width - left);
  const visBottom = Math.min(scaledHeight, PRINT_CANVAS.height - top);
  const visW = visRight - visLeft;
  const visH = visBottom - visTop;

  const compositeInput: Parameters<ReturnType<typeof sharp>["composite"]>[0] = [];

  if (visW > 0 && visH > 0) {
    // Extract only the visible portion from the working buffer (in natural coords)
    // to avoid creating huge intermediate images when scale is large
    const natLeft = Math.round(visLeft / placement.scale);
    const natTop = Math.round(visTop / placement.scale);
    const natW = Math.min(Math.max(1, Math.round(visW / placement.scale)), designWidth - natLeft);
    const natH = Math.min(Math.max(1, Math.round(visH / placement.scale)), designHeight - natTop);

    const cropped = await sharp(workingBuffer)
      .extract({ left: natLeft, top: natTop, width: natW, height: natH })
      .toBuffer();

    const resized = await sharp(cropped)
      .resize(visW, visH, { fit: "fill" })
      .png()
      .toBuffer();

    compositeInput.push({ input: resized, left: Math.max(0, left), top: Math.max(0, top) });
  }

  const composited = await sharp({
    create: {
      width: PRINT_CANVAS.width,
      height: PRINT_CANVAS.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(compositeInput)
    .png()
    .toBuffer();

  const outputKey = storageKeys.printFile(`${Date.now()}.png`);
  await uploadFile(outputKey, composited, "image/png");

  return outputKey;
}
