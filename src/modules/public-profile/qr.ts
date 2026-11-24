import "server-only";
import QRCode from "qrcode";

const OPTIONS = { errorCorrectionLevel: "M" as const, margin: 2, color: { dark: "#1a1714", light: "#ffffff" } };

export async function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { ...OPTIONS, type: "svg", width: 512 });
}

export async function qrPng(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, { ...OPTIONS, type: "png", width: 1024 });
}
