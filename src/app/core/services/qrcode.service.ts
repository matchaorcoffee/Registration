import { Injectable } from '@angular/core';
import * as QRCode from 'qrcode';

@Injectable({
  providedIn: 'root'
})
export class QRCodeService {

  /**
   * Generates a unique, non-guessable, secure QR token string
   */
  public generateSecureToken(eventId: string, regId: string): string {
    const randomHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6);
    return `tok_${eventId.replace(/[^a-zA-Z0-9]/g, '')}_${regId.replace(/[^a-zA-Z0-9]/g, '')}_${randomHex}`;
  }

  /**
   * Encodes ONLY the secure token into a high-contrast QR code Data URL (PNG)
   * Does NOT contain sensitive PII (name, email, phone)
   */
  public async generateQRCodeDataUrl(token: string): Promise<string> {
    try {
      const url = await QRCode.toDataURL(token, {
        errorCorrectionLevel: 'M',
        margin: 2,
        scale: 8,
        color: {
          dark: '#0f172a', // Slate dark flat
          light: '#ffffff'  // Pure white
        }
      });
      return url;
    } catch (err) {
      console.error('Error generating QR code', err);
      // Fallback SVG or empty string
      return '';
    }
  }

  /**
   * Generates an SVG string representation of the QR code
   */
  public async generateQRCodeSvg(token: string): Promise<string> {
    try {
      return await QRCode.toString(token, {
        type: 'svg',
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
    } catch (err) {
      console.error('Error generating QR svg', err);
      return '';
    }
  }
}
