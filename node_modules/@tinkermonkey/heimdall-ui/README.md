# Heimdall UI Design System

Production component library for the Heimdall design system. Built with React 18, TypeScript, Tailwind CSS, and self-hosted fonts.

## Phase 1: Foundation & Core Components

This phase establishes the token system, build infrastructure, and core component library.

### ✅ Completed

- Vite + React 18 + TypeScript + Tailwind CSS build pipeline
- CSS custom property token system (light canvas default mode)
- Cyan accent tokens (brand primary color)
- Self-hosted Inter and JetBrains Mono fonts (local file declarations)
- Tailwind theme extending with CSS variable references
- Playwright testing infrastructure with animation freezing utilities
- Base test utilities for font loading, dark-canvas toggle, and token validation
- 28 UI components across 7 categories (primitives, forms, data display, shell, navigation, dialogs, containers)
- Comprehensive test suite (6 spec files covering foundations, primitives, data display, shell, integration, and reference previews)
- Example applications (Homelab Dashboard and Context Studio rebuilt with design system)

### Getting Started

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run tests with UI
npm run test:ui
```

### Project Structure

```
src/
├── components/                # 28 UI components
│   ├── Icon.tsx              # Icon renderer
│   ├── Button.tsx            # Button component
│   ├── Modal.tsx             # Modal dialog
│   └── [24 more components]
├── examples/                  # Example applications
│   ├── HomelabDashboardRebuilt.tsx
│   └── ContextStudioRebuilt.tsx
├── test-pages/               # Test page implementations
├── fonts/
│   ├── fonts.css              # @font-face declarations
│   ├── inter/                 # Inter font files (self-hosted)
│   └── jetbrains-mono/        # JetBrains Mono files (self-hosted)
├── tokens/
│   └── tokens.css             # Design tokens as CSS custom properties
├── index.css                  # Main stylesheet (tokens + Tailwind)
├── index.ts                   # Barrel export (28 components)
├── main.tsx                   # Vite entry point
└── App.tsx                    # Root component

tests/
├── foundation.spec.ts         # Token system validation tests
├── primitives.spec.ts         # Primitive components tests
├── data-display.spec.ts       # Data display components tests
├── shell-framework.spec.ts    # Shell framework tests
├── rebuilt-view-integration.spec.ts  # Integration tests
├── reference-previews.spec.ts # Reference preview tests
└── utils/
    └── test-helpers.ts        # Test utilities

tailwind.config.ts             # Tailwind theme extending CSS variables
playwright.config.ts           # Playwright testing configuration
postcss.config.js              # PostCSS + Tailwind + Autoprefixer
vite.config.ts                 # Vite build configuration
```

### Design Token Reference

#### Two-Surface Architecture

Every screen has exactly two surfaces:

- **Shell**: Always dark (`#0B0F14`)
- **Canvas**: Light default (`#FFFFFF`)

Token variables automatically resolve based on surface context. No component-level conditional rendering needed.

#### Accent Color (Cyan)

```css
--accent-primary:       #22d3ee   /* bright, active states */
--accent-primary-hover: #06b6d4   /* hover state */
--accent-primary-deep:  #0e7ea3   /* deep/CTA */
```

#### Semantic Status Colors

```css
--status-ok:       #22c55e   /* emerald, ok/running */
--status-warn:     #eab308   /* amber, warn/degraded */
--status-error:    #ef4444   /* rose, error/failed */
--status-emerald:  #10b981
--status-amber:    #f59e0b
--status-rose:     #f43f5e
--status-violet:   #8b5cf6
```

### Font Files

Font files are declared but not yet self-hosted. Download from:

- **Inter**: https://github.com/rsms/inter/releases (weights: 300–900)
- **JetBrains Mono**: https://github.com/JetBrains/JetBrainsMono/releases (weights: 400, 500, 600)

Place `.woff2` files in `src/fonts/{inter,jetbrains-mono}/` directories.

### Build Output

The library builds to ES modules with TypeScript types:

```
dist/
├── index.js        # Component library
├── index.d.ts      # TypeScript declarations
└── style.css       # Compiled CSS (tokens + components)
```

### Testing

Tests validate:

- Light canvas tokens applied by default
- Cyan accent color (brand primary)
- Semantic status colors
- Radius and spacing scale
- Animation freezing for consistent screenshots
- Font loading and dark-canvas class application

Run tests:

```bash
npm test              # Headless mode
npm run test:ui       # Interactive UI
```

## Upcoming Work

Future phases will expand the design system with:

- Advanced layout components
- Data visualization components
- Enhanced accessibility features
- Visual regression testing refinements
- Storybook documentation
