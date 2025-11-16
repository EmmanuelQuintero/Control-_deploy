# Control+ Design Guidelines

## Design Approach
**System-Based with Health App References**: Leveraging Material Design principles with inspiration from Apple Health, Google Fit, and Strava for proven wellness tracking patterns. Focus on clarity, data visualization, and user motivation.

## Core Design Elements

### Color Palette
**Light Mode:**
- Primary: 142 71% 45% (Wellness Green - calming, health-focused)
- Secondary: 217 91% 60% (Trust Blue - reliability)
- Background: 0 0% 98% (Soft White)
- Surface: 0 0% 100% (Pure White)
- Text Primary: 220 13% 18%
- Text Secondary: 220 9% 46%

**Dark Mode:**
- Primary: 142 50% 55% (Lighter wellness green)
- Secondary: 217 80% 65%
- Background: 222 47% 11% (Deep navy)
- Surface: 217 33% 17%
- Text Primary: 210 40% 98%
- Text Secondary: 217 20% 70%

**Accent Colors:**
- Success/Steps: 142 71% 45%
- Nutrition: 45 93% 47% (Vibrant orange)
- Sleep: 266 70% 60% (Calming purple)
- Warning: 38 92% 50%
- Error: 0 84% 60%

### Typography
- **Primary Font**: Inter (Google Fonts) - modern, highly legible for data
- **Headers**: 600-700 weight, sizes 2xl-4xl
- **Body Text**: 400 weight, base to lg sizes
- **Data/Metrics**: 700 weight, bold numerical display
- **Small Labels**: 500 weight, sm to xs sizes

### Layout System
**Spacing Units**: Consistent use of 4, 6, 8, 12, 16, 24 for padding, margins, and gaps
- Tight spacing (p-4, gap-4) for compact data displays
- Medium spacing (p-6, p-8) for card content
- Wide spacing (p-12, p-16) for major section breaks

**Container Structure:**
- Admin/User Dashboards: Sidebar navigation (64-72 width) + main content area
- Max content width: max-w-7xl
- Data cards: max-w-sm to max-w-md
- Forms: max-w-lg centered

### Component Library

**Navigation:**
- Persistent sidebar with icon + label for main sections
- Top bar with user avatar, notifications bell, and quick actions
- Mobile: Bottom tab navigation for primary features
- Admin toggle switch to access admin panel

**Cards & Data Display:**
- Rounded corners (rounded-xl to rounded-2xl)
- Subtle shadows (shadow-sm to shadow-md)
- Stats cards with large numbers (text-4xl to text-5xl) and trend indicators
- Progress rings/bars for goals (steps, calories, sleep hours)
- Timeline views for activity history

**Forms & Inputs:**
- Consistent rounded-lg inputs with focus rings matching primary color
- Clear labels above inputs
- Helper text in text-secondary color
- Dark mode inputs with proper contrast (bg-surface)
- Date/time pickers for sleep and meal logging

**Dashboard Components:**
- **Exercise Section**: Step counter with circular progress, activity cards grid (2-3 columns), recent workouts list
- **Nutrition Section**: Calorie tracking with macro breakdown (pie/donut chart), meal log cards with timestamps
- **Sleep Section**: Sleep duration with quality indicator, sleep cycle visualization, recommendations list with icons
- **Profile**: Card-based layout with avatar, info grid (2 columns), editable fields

**Admin-Specific:**
- User management table with search/filters
- Notification composer with recipient selection
- Analytics dashboard with charts showing user engagement
- Bulk action buttons with confirmation modals

**Data Visualization:**
- Line charts for trends (weight, sleep patterns)
- Bar charts for weekly comparisons
- Circular progress indicators for daily goals
- Color-coded status badges (active/inactive, goal met/not met)

### Interaction Patterns
- Smooth transitions (transition-all duration-200)
- Hover states with subtle scale/brightness changes
- Loading skeletons for data fetching (animate-pulse)
- Toast notifications for success/error feedback
- Modal overlays for detailed views and confirmations

### Authentication Pages
- Centered card layout (max-w-md) on gradient background
- Logo at top, form fields with clear validation
- "Remember me" checkbox, "Forgot password" link
- Social login options if applicable
- Toggle between login/register with smooth transition

### Images
**Hero Sections**: Not applicable for dashboard app
**Supporting Images:**
- Empty state illustrations for sections with no data (friendly, motivational)
- Profile avatars (user-uploaded with fallback initials)
- Achievement badges/icons for milestones
- Sleep recommendation cards with calming imagery

### Accessibility
- High contrast ratios (4.5:1 minimum for text)
- Keyboard navigation for all interactive elements
- ARIA labels for icon-only buttons
- Focus indicators clearly visible in both modes
- Screen reader friendly data tables and charts

### Mobile Responsiveness
- Stack cards to single column on mobile
- Collapsible sidebar to hamburger menu
- Touch-friendly button sizes (min-h-12)
- Swipeable cards for activity/meal logs
- Bottom sheet modals for forms