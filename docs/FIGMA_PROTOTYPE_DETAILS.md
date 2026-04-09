# Tutoria Prototype Details (Figma Alignment)

Perfect! A comprehensive Tutoria web application prototype has been built based on the provided design specifications.

The prototype demonstrates a **"phygital" learning platform** for children with dyslexia, featuring:

- Parent administration tools
- A minimalist child interface centered around NFC card interactions

## Key Features Implemented

### Design System

- Dyslexia-friendly **Lexend** font with increased letter spacing
- Tutoria color palette:
  - Soft Navy `#1F3A5F`
  - Warm Orange `#FF9F1C`
  - Cream background `#FDFBF7`
  - Dark Charcoal text `#2B2D42`
  - Mint Green `#2EC4B6`
  - Coral `#E71D36`
- All touch targets meet **48x48px** minimum accessibility standard
- Large text sizes (**1.125rem to 2rem**) for improved readability
- Generous whitespace and high-contrast elements

### Parent Flow

- Login/Onboarding screen with professional navy blue branding
- Dashboard with circular progress ring showing weekly completion (**3/5 lessons**)
- Analytics page with bar charts for:
  - Sounds mastered
  - Daily practice time
- Bottom navigation for easy access to:
  - Home
  - Progress
  - Settings

### Child Flow

- Scan Mode with pulsing NFC card animation (minimal UI, passive listening state)
- Active Lesson displays large phonics sounds (for example: **"th"**) with animated audio waveform
- Success screen with star celebration and auto-return to scan mode
- Demo mode available for testing without physical NFC cards

### Developer Tools

- NFC Write utility for programming blank tags with lesson IDs
- Predefined lesson library:
  - Digraphs: `th`, `ch`, `sh`, `ph`, `wh`
  - Vowels
- Simulated write process with status feedback

## Technical Stack and Navigation

The application uses:

- **React Router** for navigation
- **Motion** for smooth animations
- **Recharts** for progress visualization

You can explore all flows by:

- Starting at the login page, or
- Jumping directly to the Child View or Developer Tools using quick access buttons
