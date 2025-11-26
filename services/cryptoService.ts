// In a real app, this would use SubtleCrypto or crypto-js
// This creates a visual simulation of encryption for the UI

export const CryptoService = {
  encrypt: async (text: string, key: string): Promise<{ content: string; iv: string }> => {
    // Simulate processing time
    // We are base64 encoding just to make it look "scrambled" for the demo
    // In production: await window.crypto.subtle.encrypt(...)
    const fakeEncrypted = btoa(text.split('').reverse().join('')); 
    return {
      content: fakeEncrypted,
      iv: crypto.randomUUID()
    };
  },

  decrypt: async (encryptedContent: string, key: string): Promise<string> => {
    try {
      // Reverse the fake encryption
      return atob(encryptedContent).split('').reverse().join('');
    } catch (e) {
      return "Error Decrypting";
    }
  }
};