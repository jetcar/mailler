#!/bin/bash

echo "🔍 Mailler Project Verification"
echo "==============================="
echo ""

errors=0
warnings=0

# Check backend files
echo "📦 Checking Backend Files..."
backend_files=(
    "backend/package.json"
    "backend/.env.example"
    "backend/Dockerfile"
    "backend/src/app.js"
    "backend/src/config/database.js"
    "backend/src/config/passport.js"
    "backend/src/models/User.js"
    "backend/src/models/EmailAccount.js"
    "backend/src/models/Message.js"
    "backend/src/models/Settings.js"
    "backend/src/models/index.js"
    "backend/src/routes/auth.js"
    "backend/src/routes/accounts.js"
    "backend/src/routes/messages.js"
    "backend/src/services/mailer.js"
    "backend/src/services/receiver.js"
    "backend/src/services/encryption.js"
    "backend/src/middleware/auth.js"
    "backend/src/middleware/errorHandler.js"
    "backend/tests/integration.test.js"
    "backend/tests/real-email.test.js"
)

for file in "${backend_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file MISSING"
        ((errors++))
    fi
done

echo ""
echo "📦 Checking Frontend Files..."
frontend_files=(
    "frontend/package.json"
    "frontend/vite.config.js"
    "frontend/index.html"
    "frontend/Dockerfile"
    "frontend/nginx.conf"
    "frontend/src/main.jsx"
    "frontend/src/App.jsx"
    "frontend/src/App.css"
    "frontend/src/components/Login.jsx"
    "frontend/src/components/Inbox.jsx"
    "frontend/src/components/Compose.jsx"
    "frontend/src/components/Settings.jsx"
    "frontend/src/services/api.js"
)

for file in "${frontend_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file MISSING"
        ((errors++))
    fi
done

echo ""
echo "📦 Checking Database Files..."
db_files=(
    "database/migrations/001_create_users.sql"
    "database/migrations/002_create_email_accounts.sql"
    "database/migrations/003_create_messages.sql"
    "database/migrations/004_create_settings.sql"
)

for file in "${db_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file MISSING"
        ((errors++))
    fi
done

echo ""
echo "📦 Checking Documentation Files..."
doc_files=(
    "README.md"
    "QUICKSTART.md"
    "IMPLEMENTATION.md"
    "description.md"
    "docker-compose.yml"
    "setup.sh"
    ".env.example"
)

for file in "${doc_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file MISSING"
        ((errors++))
    fi
done

echo ""
echo "🔧 Checking Prerequisites..."

if command -v node &> /dev/null; then
    node_version=$(node --version)
    echo "  ✅ Node.js installed: $node_version"
else
    echo "  ⚠️  Node.js not found (required for development)"
    ((warnings++))
fi

if command -v npm &> /dev/null; then
    npm_version=$(npm --version)
    echo "  ✅ npm installed: $npm_version"
else
    echo "  ⚠️  npm not found (required for development)"
    ((warnings++))
fi

if command -v psql &> /dev/null; then
    psql_version=$(psql --version | cut -d' ' -f3)
    echo "  ✅ PostgreSQL client installed: $psql_version"
else
    echo "  ⚠️  PostgreSQL client not found (needed for manual setup)"
    ((warnings++))
fi

if command -v docker &> /dev/null; then
    docker_version=$(docker --version | cut -d' ' -f3 | tr -d ',')
    echo "  ✅ Docker installed: $docker_version"
else
    echo "  ⚠️  Docker not found (optional, for containerized deployment)"
    ((warnings++))
fi

echo ""
echo "📊 Summary"
echo "=========="
total_files=$((${#backend_files[@]} + ${#frontend_files[@]} + ${#db_files[@]} + ${#doc_files[@]}))
found_files=$((total_files - errors))

echo "Files: $found_files/$total_files found"
echo "Errors: $errors"
echo "Warnings: $warnings"
echo ""

if [ $errors -eq 0 ]; then
    echo "✅ All required files are present!"
    echo ""
    echo "Next steps:"
    echo "1. Run: ./setup.sh"
    echo "2. Configure backend/.env with your OIDC credentials"
    echo "3. Start development servers (see README.md)"
    echo ""
    exit 0
else
    echo "❌ Some files are missing. Please check the implementation."
    echo ""
    exit 1
fi
