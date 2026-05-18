# Self-Hosted Fonts

This directory contains @font-face declarations and font files downloaded via postinstall script.

## Font Sources

### Inter
- **Source**: https://github.com/rsms/inter/releases (via jsDelivr CDN)
- **Weights**: 300, 400, 500, 600, 700, 800, 900
- **Format**: .woff2 (modern browsers)

### JetBrains Mono
- **Source**: https://github.com/JetBrains/JetBrainsMono/releases (via jsDelivr CDN)
- **Weights**: 400, 500, 600
- **Format**: .woff2 (modern browsers)

## Installation

Font files are automatically downloaded when installing dependencies:

```bash
npm install
# or
pnpm install
# Font files are fetched via `postinstall` hook
```

## Font File Structure

After installation, the directory structure is:

```
src/fonts/
├── fonts.css                          # @font-face declarations
├── inter/
│   ├── Inter-Light.woff2
│   ├── Inter-Regular.woff2
│   ├── Inter-Medium.woff2
│   ├── Inter-SemiBold.woff2
│   ├── Inter-Bold.woff2
│   ├── Inter-ExtraBold.woff2
│   └── Inter-Black.woff2
├── jetbrains-mono/
│   ├── JetBrainsMono-Regular.woff2
│   ├── JetBrainsMono-Medium.woff2
│   └── JetBrainsMono-SemiBold.woff2
└── README.md
```

## Testing

Tests verify that:

1. @font-face declarations exist and are valid CSS
2. Font files exist on the filesystem
3. The font-display strategy ensures layout stability

## Notes

- Font files are downloaded during `postinstall`, not committed to version control
- Only .woff2 format is used (modern browsers only)
- Total download size: ~300KB for both font families
- Download script: `scripts/download-fonts.js`
