# Inventory Management System

A full-stack inventory management system with AI-powered product image generation and real-time stock tracking.

## Features

- **Real-time Inventory Tracking**: Monitor stock levels, categories, and transactions.
- **AI Image Generation**: Generate professional product images using Google Gemini.
- **Role-Based Access Control**: Manage permissions for Owners, Admins, Users, and Viewers.
- **Stock Movement Confirmation**: Prevent accidental changes with a confirmation dialog for stock IN/OUT operations.
- **CSV Import/Export**: Easily manage large datasets.
- **Interactive Dashboard**: Visual insights into stock levels and recent activities.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Configuration

1. Create a `.env` file in the root directory based on `.env.example`.
2. Add your Google Gemini API Key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
3. Ensure you have a `firebase-applet-config.json` file in the root directory with your Firebase project configuration.

### Running the Application

#### Development Mode

Starts the server with Vite middleware for hot module replacement:
```bash
npm run dev
```

#### Production Mode

Build the frontend and start the production server:
```bash
npm run build
npm start
```

## Deployment

This application is designed to be deployed to containerized environments like Google Cloud Run. Ensure that the `GEMINI_API_KEY` and Firebase configuration are correctly set in your deployment environment.

## License

MIT
