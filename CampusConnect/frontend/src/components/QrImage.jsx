import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Draws a QR code for any text. Also exposes the image data so it can be downloaded.
export default function QrImage({ text, size = 220, className = "" }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(text, { width: size * 2, margin: 1, errorCorrectionLevel: "M" })
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(""));
    return () => {
      alive = false;
    };
  }, [text, size]);

  if (!src) return <div style={{ width: size, height: size }} className={`bg-slate-100 rounded ${className}`} />;
  return <img src={src} width={size} height={size} alt="QR code" className={className} />;
}

export async function downloadQr(text, filename) {
  const url = await QRCode.toDataURL(text, { width: 800, margin: 2, errorCorrectionLevel: "M" });
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
