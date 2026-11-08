# XL Creator Studio

**XL Creator Studio** is a free, open-source 9:16 vertical teleprompter, `-14 LUFS` broadcast audio mastering suite, and short-form video studio for Windows 10/11 (64-bit).

- **Website & Download Page**: [https://xlexhibitproduction.com/creator-studio](https://xlexhibitproduction.com/creator-studio)
- **Latest Windows Release**: [GitHub Releases (`v1.0.0`)](https://github.com/Frankliu6892/xl-creator-studio-releases/releases/latest)
- **License**: [MIT License](./LICENSE)

---

## Core Features

1. **Camera & Custom Virtual Backgrounds**: 9:16 vertical stage framing (`38%` Eye-Line guide), MediaPipe AI person segmentation, and custom background image upload.
2. **5-Second Broadcast Sound Check (`-14 LUFS`)**: Automatic high-pass filtering, FFT noise reduction (`afftdn`), dynamic range compression (`acompressor`), and EBU R128 / `-14 LUFS` loudness normalization (`loudnorm`).
3. **Eye-Line Teleprompter & Offline Whisper AI ASR**: Top-edge eye-line teleprompter and free-record mode powered by local `whisper.cpp` (`ggml-tiny.en`) speech-to-text transcription.
4. **Inline Transcript Editor, Hook Banner & 1080p MP4 Export**: Edit burned-in captions inline, customize 3-second hook banners, encode `1080x1920` H.264 MP4s via hardware GPU (`h264_nvenc` / `h264_amf` / `h264_qsv` with CPU `libx264` fallback), and transfer to phone via local Wi-Fi QR code.
5. **Uninstallation**: Includes both standard Windows Add/Remove Programs uninstallation (`build/installer.nsh`) and standalone `Uninstall XL Creator Studio.exe`.

---

## Building from Source

```bash
npm install
npm start        # Run in development mode
npm run dist     # Build Windows 64-bit NSIS installer in dist/
```

---

## Code signing policy

Free code signing provided by [SignPath.io](https://about.signpath.io), certificate by [SignPath Foundation](https://signpath.org).

### Team Roles & Members
- **Committers and reviewers**: [@Frankliu6892](https://github.com/Frankliu6892)
- **Approvers**: [@Frankliu6892](https://github.com/Frankliu6892)

### Privacy Policy
This program will not transfer any information to other networked systems unless specifically requested by the user or the person installing or operating it. All video recording, audio DSP mastering (`FFmpeg`), background segmentation (`MediaPipe`), and speech-to-text transcription (`whisper.cpp`) run locally on the user's machine. The application only checks `https://xlexhibitproduction.com/studio-updates/latest.yml` for software updates. Full website privacy policy: [https://xlexhibitproduction.com/privacy](https://xlexhibitproduction.com/privacy).
