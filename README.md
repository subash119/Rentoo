# Rentoo
### Rental Marketplace

A modern web application for renting and listing items, built with React, TypeScript, and Node.js. The platform connects vendors with customers, enabling easy rental transactions and communication.

## Features & Implementation Details

### Authentication & Authorization
- **JWT-based Authentication**
  - Token generation with 24-hour expiry
  - Secure password hashing using bcrypt
  - Token validation middleware
  - Auto token refresh mechanism
- **Role-based Access Control**
  - Three roles: Admin, Customer, and Vendor
  - Protected route middleware
  - Role-specific route guards
- **API Endpoints**:
  ```
  POST   /api/v1/auth/register    # User registration
  POST   /api/v1/auth/login       # User login
  GET    /api/v1/auth/me         # Get current user profile
  ```

### Admin Management
- **Admin User Creation**
  ```bash
  # Create admin user with default credentials
  cd server
  node src/createAdmin.js
  ```
  Default admin credentials:
  - Email: admin@rentoo.com
  - Password: admin123
  
- **Admin Dashboard Features**
  - User management (view, delete users)
  - Product oversight
  - Rental request monitoring
  - System statistics
  
- **Admin API Endpoints**:
  ```
  GET    /api/admin/stats        # Get dashboard statistics
  GET    /api/admin/users        # List all users
  PATCH  /api/admin/users/:id    # Update user role
  DELETE /api/admin/users/:id    # Delete user
  GET    /api/admin/products     # List all products
  GET    /api/admin/rentals      # List all rentals
  ```

### User Management
- **User Registration**
  - Role selection (Customer/Vendor)
  - Email validation
  - Password strength requirements
- **Profile Management**
  - Name and password updates
  - Contact information management
- **API Endpoints**:
  ```
  GET    /api/users/profile      # Get user profile
  PUT    /api/users/profile      # Update user profile
  PATCH  /api/users/password     # Update password
  ```

### Product Management
- **Product Listing**
  - Multiple image upload (max 5 images)
  - Image validation and optimization
  - Rich text description
  - Location-based listing
- **Vendor Controls**
  - Product availability toggle
  - Price management
  - Product deletion with rental history preservation
- **API Endpoints**:
  ```
  GET    /api/v1/products              # List all products
  POST   /api/v1/products              # Create product (vendor)
  GET    /api/v1/products/:id          # Get product details
  PUT    /api/v1/products/:id          # Update product (vendor)
  DELETE /api/v1/products/:id          # Delete product (vendor)
  GET    /api/v1/products/vendor       # Get vendor's products
  ```

### Search & Filter System
- **Real-time Search**
  - Multi-field search implementation
  - Debounced search input
  - Client-side filtering
- **Advanced Filtering**
  - Category filtering
  - Price range filtering
  - Location filtering
  - Availability status
- **Sort Options**
  - Price sorting (asc/desc)
  - Date added sorting
  - Relevance sorting

### Rental System
- **Rental Request Management**
  ```
  POST   /api/v1/rental-requests           # Create rental request
  GET    /api/v1/rental-requests/customer  # Get customer requests
  GET    /api/v1/rental-requests/vendor    # Get vendor requests
  PATCH  /api/v1/rental-requests/:id/status # Update request status
  ```
- **Date Management**
  - Availability checking
  - Date conflict prevention
  - Automatic price calculation
- **Status Workflow**
  1. Pending (initial state)
  2. Approved (vendor action)
  3. Rejected (vendor action)
  4. Completed (automatic)
  5. Cancelled (customer action)
- **Payment Integration**
  ```
  PATCH  /api/v1/rental-requests/:id/paid  # Mark rental as paid
  ```

### Chat System
- **Real-time Communication**
  - Polling-based updates
    - Messages: 3-second interval
    - Chat list: 10-30 second interval
  - Optimistic UI updates
- **Message Management**
  - History preservation
  - Read status tracking
  - Last seen timestamps
- **API Endpoints**:
  ```
  GET    /api/v1/chat/users           # Get chat users
  GET    /api/v1/chat/messages/:userId # Get messages with user
  POST   /api/v1/chat/send            # Send message
  GET    /api/v1/chat/unread          # Get unread count
  ```

### Notification System
- **Real-time Notifications**
  - Rental request updates
  - Chat messages
  - Payment confirmations
- **API Endpoints**:
  ```
  GET    /api/notifications           # Get notifications
  PATCH  /api/notifications/:id/read  # Mark as read
  PATCH  /api/notifications/read-all  # Mark all as read
  GET    /api/notifications/unread-count # Get unread count
  ```

## Detailed Functionality Breakdown

### Admin Functionality
1. **User Management**
   - View all users in the system
   - Delete user accounts
   - Update user roles
   - Monitor user activities
   - View user statistics

2. **Product Management**
   - View all products in the system
   - Delete inappropriate products
   - Monitor product listings
   - View product statistics

3. **Rental Management**
   - View all rental transactions
   - Monitor rental status changes
   - Access rental statistics
   - View rental history

4. **System Statistics**
   - Total user count by role
   - Total product listings
   - Total rental transactions
   - Recent activity monitoring
   - Revenue statistics

5. **Admin Dashboard**
   - Real-time statistics overview
   - User management interface
   - Product management interface
   - Rental management interface
   - Activity monitoring tools

### Vendor Functionality
1. **Product Management**
   - Create new product listings
   - Upload multiple product images (up to 5)
   - Edit product details:
     - Name and description
     - Category selection
     - Price setting (daily rate)
     - Location information
     - Availability status
   - Delete own products
   - View product statistics

2. **Rental Management**
   - View incoming rental requests
   - Accept/Reject rental requests
   - View rental history
   - Monitor active rentals
   - Track rental status changes
   - View rental statistics

3. **Communication**
   - Chat with customers
   - View chat history
   - Receive real-time messages
   - Get unread message notifications
   - Send/receive rental-related messages

4. **Vendor Dashboard**
   - Product listing overview
   - Rental request management
   - Revenue statistics
   - Customer communication center
   - Activity notifications

5. **Profile Management**
   - Update personal information
   - Manage contact details
   - Update password
   - View account statistics

### Customer Functionality
1. **Product Browsing**
   - View all available products
   - Search products by:
     - Name
     - Category
     - Location
     - Price range
     - Availability
   - Filter and sort products
   - View detailed product information
   - View vendor information

2. **Rental Management**
   - Send rental requests
   - View rental request status
   - Cancel rental requests
   - View rental history
   - Track active rentals
   - Make rental payments

3. **Communication**
   - Chat with vendors
   - View chat history
   - Send/receive messages
   - Get message notifications
   - Discuss rental details

4. **Customer Dashboard**
   - View active rentals
   - Track rental history
   - Access chat messages
   - View notifications
   - Manage profile

5. **Profile Management**
   - Update personal information
   - Manage contact details
   - Change password
   - View rental history

### Common Features
1. **Authentication**
   - Register new account
   - Login with email/password
   - Automatic token refresh
   - Password reset
   - Session management

2. **Notification System**
   - Real-time notifications
   - Email notifications
   - System alerts
   - Status updates
   - Message notifications

3. **Search & Filter**
   - Global search functionality
   - Advanced filtering options
   - Sort by various criteria
   - Location-based search
   - Category filtering

4. **User Interface**
   - Responsive design
   - Mobile-friendly layout
   - Intuitive navigation
   - Real-time updates
   - Loading states
   - Error handling
   - Success messages

5. **Security Features**
   - JWT authentication
   - Role-based access control
   - Secure password handling
   - Protected routes
   - Input validation
   - XSS protection
   - CORS configuration

## Technical Implementation

### Frontend Architecture
- **React 18 with TypeScript**
  - Functional components with hooks
  - Custom hooks for business logic
  - TypeScript interfaces for type safety
- **State Management**
  - Context API for global state
    - AuthContext for user authentication
    - NotificationContext for notifications
    - RentalContext for rental management
- **Routing**
  - React Router v6
  - Protected route components
  - Role-based access control
- **UI Components**
  - Tailwind CSS for styling
  - Responsive design
  - Custom UI components
- **API Integration**
  - Axios for HTTP requests
  - Request interceptors for token management
  - Error handling middleware

### Backend Architecture
- **Node.js with Express**
  - RESTful API design
  - Middleware-based architecture
  - Error handling middleware
- **Database**
  - MongoDB with Mongoose ODM
  - Optimized indexes
  - Data validation
- **File Upload**
  - Multer for file handling
  - Image validation
  - File size limits
- **Security**
  - JWT authentication
  - Password hashing
  - Request validation
  - CORS configuration

## Development Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Frontend Setup
1. Install dependencies:
   ```bash
   cd Rentoo
   npm install
   ```

2. Environment configuration:
   Create `.env` file:
   ```
   VITE_API_URL=http://localhost:5000
   VITE_UPLOAD_URL=http://localhost:5000/uploads
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

### Backend Setup
1. Install dependencies:
   ```bash
   cd server
   npm install
   ```

2. Environment configuration:
   Create `.env` file:
   ```
   MONGODB_URI=mongodb://localhost:27017/rentoo
   JWT_SECRET=your_jwt_secret
   PORT=5000
   UPLOAD_DIR=uploads
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

### Database Setup
1. Start MongoDB service
2. Create database:
   ```bash
   mongosh
   use rentoo
   ```

3. Create indexes:
   ```javascript
   db.products.createIndex({ name: "text", description: "text" });
   db.products.createIndex({ vendor: 1 });
   db.rentalrequests.createIndex({ product: 1, status: 1 });
   db.messages.createIndex({ sender: 1, receiver: 1 });
   ```

## Contributing

Please read our contributing guidelines before submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

