# WebStart Application Documentation

## Overview

WebStart is a Next.js-based web application designed for research proposal management and review processes. It features a comprehensive admin management system, user voting capabilities, and Google Sheets integration for data persistence.

## Technology Stack

- **Framework**: Next.js 15.4.5 with React 19.1.0
- **Styling**: Tailwind CSS
- **3D Graphics**: Three.js for animated backgrounds
- **Backend Integration**: Google Sheets API
- **Authentication**: Custom JWT-based system
- **Language**: TypeScript

## Project Structure

```
app/
├── admin-management/          # Admin dashboard
├── api/                       # API routes
│   ├── admin/                # Admin-specific endpoints
│   ├── auth/                 # Authentication
│   ├── submit-proposal/      # Proposal submission
│   └── voting/               # Voting system
├── components/               # Reusable components
│   ├── admin/               # Admin management components
│   └── [core components]
├── context/                  # React contexts
├── data/                     # Mock data and utilities
├── types/                    # TypeScript definitions
└── [pages]/                  # Application pages
```

## Authentication System

### User Roles
- **Admin**: Full system access and management capabilities
- **Reviewer**: Can review and vote on proposals
- **Coordinator**: Special administrative privileges

### Authentication Flow
1. **Login Process**: Users authenticate via `/login` page
2. **Session Management**: Uses localStorage for client-side session persistence
3. **Protected Routes**: `ProtectedRoute` component guards authenticated pages
4. **Dual Authentication**: Supports both Google Sheets and local authentication

### Key Components
- **AuthContext**: Provides authentication state management
- **ProtectedRoute**: Wrapper component for route protection
- **Login Page**: Handles user authentication with Three.js background

## Admin Management Features

### 1. Announcement Manager
- **Create/Edit**: Full CRUD operations for announcements
- **Categories**: Support for general and important update categories
- **Expiration**: Time-based announcement expiration
- **API Endpoints**: `/api/admin/announcements`

### 2. Resource Manager
- **Categories**: Review tools, reference materials, training materials
- **File Upload**: Support for file attachments via `/api/admin/upload`
- **URL Links**: External resource linking
- **API Endpoints**: `/api/admin/resources`

### 3. Process Manager
- **Document Types**: Workflows, guidelines, procedures, templates
- **Rich Content**: Full content management with attachments
- **Status Management**: Published, draft, archived states
- **Google Sheets Sync**: `/api/admin/sync-processes-to-sheets`
- **API Endpoints**: `/api/admin/processes`

### 4. Guide Manager
- **Structured Content**: Title, description, and rich content
- **File Attachments**: Multiple file support
- **Publication Control**: Published/unpublished states
- **Ordering**: Custom order management
- **API Endpoints**: `/api/admin/guides`

### 5. Support Ticket Manager
- **Ticket Management**: Status and priority updates
- **Categories**: Organized support categories
- **Notes System**: Internal notes for ticket tracking
- **Status Tracking**: Open, in-progress, resolved, closed
- **API Endpoints**: `/api/admin/support-tickets`

## User-Facing Features

### 1. Proposal Voting System
- **Proposal Display**: View all available proposals with details
- **Voting Interface**: Simple vote submission system
- **Real-time Updates**: Dynamic vote counting
- **User Vote Tracking**: Prevents duplicate voting
- **API Endpoints**: `/api/voting/proposals`, `/api/voting/vote`

### 2. Proposal Submission
- **Comprehensive Form**: Multi-field proposal submission
- **Required Fields**: Reviewer name, title, category, team size, budget, timeline
- **Rich Content**: Summary and technical approach sections
- **API Endpoints**: `/api/submit-proposal`

### 3. Resource Access
- **Categorized Resources**: Review tools, reference materials, training materials
- **File Downloads**: Direct access to uploaded files
- **External Links**: Quick access to external resources
- **Search/Filter**: Easy resource discovery

### 4. Documentation Access
- **Guides**: Step-by-step process guides
- **Documents**: Requirement documents and templates
- **Processes**: Workflow and procedure documentation
- **Support**: Contact and support ticket submission

### 5. Support System
- **Ticket Submission**: User-friendly support form
- **Category Selection**: Organized support categories
- **Contact Information**: Direct support contact options

## Google Sheets Integration

### Configuration
```env
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_CLIENT_EMAIL="your-service-account@your-project.iam.gserviceaccount.com"
GOOGLE_SHEET_ID="your-google-sheet-id-here"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Dependencies
- `google-spreadsheet`: ^4.1.0
- `google-auth-library`: ^10.2.0

### Sheet Structure
- **Announcements**: General and important updates
- **Resources**: Categorized resource management
- **Processes**: Process documentation with sync capability
- **Guides**: User guides and documentation
- **Support Tickets**: User support management
- **Users**: User authentication data
- **RD**: Research proposal data
- **Voting Results**: Vote aggregation
- **Votes**: Individual vote tracking

### Authentication Method
- **Service Account**: JWT-based authentication
- **Scopes**: `https://www.googleapis.com/auth/spreadsheets`
- **Fallback**: Local authentication when Google Sheets unavailable

## API Endpoints Documentation

### Authentication
- `POST /api/auth` - User authentication

### Admin Endpoints
- `GET/POST /api/admin/announcements` - Announcement management
- `PUT /api/admin/announcements/[id]` - Update announcements
- `GET /api/admin/all-announcements` - Fetch all announcements
- `GET/POST /api/admin/resources` - Resource management
- `PUT /api/admin/resources/[id]` - Update resources
- `GET/POST /api/admin/processes` - Process management
- `PUT /api/admin/processes/[id]` - Update processes
- `GET/POST /api/admin/guides` - Guide management
- `PUT /api/admin/guides/[id]` - Update guides
- `GET/PUT /api/admin/support-tickets` - Support ticket management
- `POST /api/admin/upload` - File upload handling
- `POST /api/admin/sync-processes-to-sheets` - Google Sheets synchronization

### User Endpoints
- `POST /api/submit-proposal` - Proposal submission
- `GET /api/voting/proposals` - Fetch proposals with voting data
- `POST /api/voting/vote` - Submit votes

## UI/UX Features

### Visual Design
- **Three.js Backgrounds**: Animated particle systems on all pages
- **Responsive Design**: Mobile-friendly Tailwind CSS implementation
- **Theme Consistency**: Purple/blue color scheme throughout
- **Interactive Elements**: Hover effects and smooth transitions

### Navigation
- **Header**: Main navigation with user info
- **Sidebar**: Quick access to all major sections
- **Footer**: Additional links and information
- **Breadcrumbs**: Clear navigation context

### Page-Specific Animations
- **Homepage**: Floating geometric shapes and particles
- **Voting**: Vote-themed particle effects
- **Admin**: Structured admin-themed animations
- **Resources**: Resource-themed visual elements
- **Support**: Support-themed particle systems

## Development Setup

### Prerequisites
- Node.js (Latest LTS)
- Google Cloud Service Account
- Google Sheets API access

### Installation
```bash
npm install
```

### Environment Setup
1. Copy `.env.example` to `.env.local`
2. Configure Google Sheets credentials
3. Set application URL

### Development Server
```bash
npm run dev
```

### Build Process
```bash
npm run build
npm start
```

## Security Considerations

- **Environment Variables**: Sensitive data stored in environment variables
- **Authentication**: JWT-based session management
- **Input Validation**: Server-side validation for all endpoints
- **File Upload**: Secure file handling with type validation
- **CORS**: Proper cross-origin resource sharing configuration

## Performance Optimizations

- **Next.js Features**: Server-side rendering and static generation
- **Image Optimization**: Next.js Image component usage
- **Code Splitting**: Automatic code splitting for optimal loading
- **Caching**: Efficient data caching strategies
- **Three.js Optimization**: Optimized 3D rendering performance

## Maintenance and Monitoring

- **Error Handling**: Comprehensive error handling throughout the application
- **Logging**: Console logging for debugging and monitoring
- **Data Backup**: Google Sheets provides automatic data backup
- **Version Control**: Git-based version management

## Future Enhancements

- **Real-time Updates**: WebSocket integration for live updates
- **Advanced Analytics**: Detailed voting and usage analytics
- **Mobile App**: React Native mobile application
- **Advanced Search**: Full-text search capabilities
- **Notification System**: Email and push notifications
- **Multi-language Support**: Internationalization features

This documentation provides a comprehensive overview of the WebStart application architecture, features, and implementation details for developers and administrators.