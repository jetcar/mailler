#!/bin/bash
set -e

echo "🚀 Mailler Setup Script"
echo "======================="
echo ""

# Check for required tools
echo "Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed. Aborting." >&2; exit 1; }

echo "✅ Prerequisites check passed"
echo ""

# Backend setup
echo "📦 Setting up backend..."
cd backend

if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit backend/.env with your actual configuration!"
    echo ""
    echo "Required settings:"
    echo "  - Database credentials (DB_USER, DB_PASSWORD, DB_NAME)"
    echo "  - OIDC provider details (OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET)"
    echo "  - SESSION_SECRET and ENCRYPTION_KEY"
    echo ""
fi

echo "Installing backend dependencies..."
npm install

echo "✅ Backend setup complete"
echo ""

# Frontend setup
echo "📦 Setting up frontend..."
cd ../frontend

echo "Installing frontend dependencies..."
npm install

echo "✅ Frontend setup complete"
echo ""

# Database setup
echo "🗄️  Database Migration"
echo ""
echo "The application will automatically:"
echo "  ✅ Create the database if it doesn't exist"
echo "  ✅ Apply all pending migrations on startup"
echo ""
echo "This works similar to Entity Framework Core in .NET!"
echo ""
echo "You can also run migrations manually:"
echo "  cd backend && npm run migrate"
echo ""

read -p "Do you want to run database migrations now? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd ../backend
    echo "Running migrations..."
    npm run migrate
    echo ""
fi

cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure OIDC provider (Auth0, Keycloak, etc.)"
echo "2. Update backend/.env with your OIDC credentials and database settings"
echo "3. Generate secure SESSION_SECRET and ENCRYPTION_KEY:"
echo "   node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
echo "4. Start the services:"
echo "   cd backend && npm run dev    # Migrations run automatically on startup!"
echo "   cd frontend && npm run dev"
echo "5. Visit http://localhost:5173"
echo ""
echo "For Docker deployment:"
echo "   docker-compose up -d"
echo ""
echo "💡 The application uses automatic migrations - no psql/createdb needed!"
echo ""
