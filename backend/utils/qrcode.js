import QRCode from 'qrcode';

export const generateUpiQrCode = async ({ upiId, payeeName, amount, invoiceNumber }) => {
  if (!upiId) return null;

  const sanitizedUpi = upiId.trim();
  const sanitizedName = (payeeName || 'Freelancer').trim();
  const upiUrl = `upi://pay?pa=${encodeURIComponent(sanitizedUpi)}&pn=${encodeURIComponent(sanitizedName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Invoice ${invoiceNumber}`)}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(upiUrl, {
      margin: 1,
      width: 220,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
    return qrDataUrl;
  } catch (err) {
    console.error('Failed to generate UPI QR code:', err.message);
    return null;
  }
};

export const generateUrlQrCode = async (url) => {
  if (!url) return null;
  try {
    const qrDataUrl = await QRCode.toDataURL(url, {
      margin: 1,
      width: 220,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
    return qrDataUrl;
  } catch (err) {
    console.error('Failed to generate URL QR code:', err.message);
    return null;
  }
};
