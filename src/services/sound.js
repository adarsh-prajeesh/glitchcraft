/**
 * Sound service stubbed out - Audio functionality removed per user request.
 */

class SoundSystem {
  constructor() {
    this.muted = true;
  }

  init() {}
  setMuted() {}
  isMuted() { return true; }
  playTone() {}
  playScanPulse() {}
  playFaceScanning() {}
  playFaceMatched() {}
  playRfidTap() {}
  playBarcodeChirp() {}
  playAccessGranted() {}
  playAccessDenied() {}
  playClick() {}
}

export const sound = new SoundSystem();

