# CF-Infobip Broadcaster - Design System

## Project Overview
**Project Name**: CF-Infobip Broadcaster - Modern UI Refresh
**Objective**: Create a modern, professional interface for WhatsApp/Telegram bulk messaging
**Target Users**: Business users needing mass communication capabilities
**Platform**: Web application with responsive design

## Color Palette

### Primary Colors
- **Primary Yellow**: `#FCE300` - Bright, energetic yellow for primary actions and branding
- **Dark Blue**: `#081F2C` - Professional dark blue for backgrounds and text
- **Pure White**: `#FFFFFF` - Clean white for cards and content areas
- **Pure Black**: `#000000` - High contrast black for text and accents

### Color Usage Guidelines

#### Primary Yellow (#FCE300)
- Primary buttons (CTA buttons)
- Brand accents and highlights
- Active states and hover effects
- Progress indicators
- Notification badges

#### Dark Blue (#081F2C)
- Main background color
- Header and navigation background
- Card shadows and borders
- Secondary text color

#### Pure White (#FFFFFF)
- Card backgrounds
- Modal backgrounds
- Form input backgrounds
- Content areas

#### Pure Black (#000000)
- Primary text color
- Headings and important text
- Icons and decorative elements
- High contrast elements

## Typography

### Font Hierarchy
- **Headings**: Bold, 24-32px
- **Subheadings**: Semi-bold, 18-20px  
- **Body Text**: Regular, 14-16px
- **Small Text**: Regular, 12-13px

### Font Family
- **Primary**: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
- **Monospace**: 'Fira Code', 'Courier New', monospace (for code/IDs)

## Component Design Principles

### 1. Minimalist & Clean
- Plenty of whitespace
- Clear visual hierarchy
- Subtle shadows and borders
- Focus on content over decoration

### 2. High Contrast & Accessibility
- WCAG AA compliance (4.5:1 contrast ratio)
- Clear focus states
- Large touch targets (44px minimum)
- Semantic HTML structure

### 3. Modern & Professional
- Rounded corners (8px default)
- Smooth transitions (200ms)
- Subtle animations
- Consistent spacing (8px grid)

### 4. Responsive Design
- Mobile-first approach
- Breakpoints: 640px, 1024px, 1280px
- Touch-friendly interfaces
- Optimized for all screen sizes

## Layout Structure

### Header (64px height)
- Logo and branding on left
- Language selector and user profile on right
- Dark blue background with yellow accents

### Main Content Area
- Max width: 1280px centered
- Sidebar: 320px (contacts panel)
- Main content: Remaining space (messaging interface)
- Responsive stacking on mobile

### Card Design
- White background
- Subtle shadows
- Rounded corners (12px)
- Consistent padding (24px)

### Button Styles

#### Primary Buttons
- Background: #FCE300 (yellow)
- Text: #000000 (black)
- Hover: Slightly darker yellow
- Active: Darker yellow with shadow
- Rounded: 8px corners

#### Secondary Buttons
- Background: Transparent
- Text: #000000 (black)
- Border: 1px solid #000000
- Hover: #081F2C background
- Active: Darker background

## Interactive Elements

### Form Inputs
- White background
- Black text
- Dark blue border (#081F2C)
- Yellow focus ring (#FCE300)
- Rounded: 6px corners

### Cards & Panels
- White background
- Subtle box shadow
- Dark blue borders (1px)
- Rounded: 12px corners
- Consistent spacing

### Navigation & Tabs
- Dark blue background
- White text
- Yellow accent for active state
- Smooth transitions
- Clear visual hierarchy

## Animation & Transitions

### Timing
- Fast: 150ms (hover states)
- Normal: 200ms (most transitions)
- Slow: 300ms (modals, large elements)

### Easing
- Ease-out for hover states
- Ease-in-out for modals
- Linear for loading animations

## Responsive Breakpoints

### Mobile (< 640px)
- Single column layout
- Stacked navigation
- Full-width cards
- Touch-optimized spacing

### Tablet (640px - 1024px)
- Two-column layout
- Horizontal scrolling for small tables
- Adjusted spacing and sizing

### Desktop (> 1024px)
- Three-column layout
- Fixed sidebar
- Optimized for mouse interaction
- Maximum content width

## Accessibility Features

### Keyboard Navigation
- Tab order follows visual hierarchy
- Focus indicators visible
- Skip navigation options
- Keyboard shortcuts where appropriate

### Screen Reader Support
- Semantic HTML structure
- ARIA labels and descriptions
- Alt text for images
- Announcements for dynamic content

### Visual Accessibility
- High contrast colors
- Large touch targets
- Clear visual hierarchy
- Consistent interaction patterns

## Implementation Notes

### CSS Custom Properties
```css
:root {
  --color-primary: #FCE300;
  --color-dark: #081F2C;
  --color-white: #FFFFFF;
  --color-black: #000000;
  --border-radius: 8px;
  --border-radius-large: 12px;
  --spacing-unit: 8px;
  --transition-fast: 150ms;
  --transition-normal: 200ms;
  --transition-slow: 300ms;
}
```

### Component Structure
- Use semantic HTML5 elements
- CSS Grid for layouts
- Flexbox for components
- CSS custom properties for theming
- Mobile-first media queries

This design system provides a modern, professional interface that's accessible, responsive, and maintains brand consistency throughout the application.