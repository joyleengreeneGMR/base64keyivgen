import { Component, ChangeDetectionStrategy, signal } from '@angular/core';

interface CryptoAlgorithm {
  name: string;
  value: 'AES-CBC' | 'AES-GCM';
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  algorithms: CryptoAlgorithm[] = [
    { name: 'AES-CBC', value: 'AES-CBC' },
    { name: 'AES-GCM', value: 'AES-GCM' },
  ];

  keySizes: number[] = [128, 256];

  selectedAlgorithm = signal<CryptoAlgorithm['value']>('AES-GCM');
  selectedKeySize = signal<number>(256);
  generatedKey = signal<string | null>(null);
  generatedIv = signal<string | null>(null);
  
  keyCopied = signal(false);
  ivCopied = signal(false);
  isGenerating = signal(false);
  error = signal<string | null>(null);

  constructor() {
    // Generate initial values on load
    this.generateKeyAndIv();
  }

  onAlgorithmChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedAlgorithm.set(target.value as CryptoAlgorithm['value']);
  }

  onKeySizeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedKeySize.set(Number(target.value));
  }

  private bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async generateKeyAndIv(): Promise<void> {
    if (!crypto.subtle) {
      this.error.set('Web Crypto API is not available in this browser. Please use a modern, secure browser.');
      return;
    }
    
    this.isGenerating.set(true);
    this.error.set(null);
    this.generatedKey.set(null);
    this.generatedIv.set(null);

    try {
      const algorithm = this.selectedAlgorithm();
      const keySize = this.selectedKeySize();
      
      // Generate Key
      const cryptoKey = await crypto.subtle.generateKey(
        { name: algorithm, length: keySize },
        true,
        ['encrypt', 'decrypt']
      );
      
      const exportedKey = await crypto.subtle.exportKey('raw', cryptoKey);
      this.generatedKey.set(this.bytesToBase64(new Uint8Array(exportedKey)));

      // Generate IV
      // AES-GCM best practice is a 12-byte (96-bit) IV. AES-CBC requires a 16-byte (128-bit) IV.
      const ivSize = algorithm === 'AES-GCM' ? 12 : 16;
      const iv = crypto.getRandomValues(new Uint8Array(ivSize));
      this.generatedIv.set(this.bytesToBase64(iv));

    } catch (err) {
      console.error('Key generation failed:', err);
      this.error.set('An error occurred during key generation. See console for details.');
    } finally {
      this.isGenerating.set(false);
    }
  }

  copyToClipboard(text: string | null, type: 'key' | 'iv'): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'key') {
        this.keyCopied.set(true);
        setTimeout(() => this.keyCopied.set(false), 2000);
      } else {
        this.ivCopied.set(true);
        setTimeout(() => this.ivCopied.set(false), 2000);
      }
    });
  }
}