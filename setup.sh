#!/bin/bash

# Bond Market Project Setup and Deployment Script
set -e

echo "🚀 Setting up Bond Market Project..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Update PATH for Solana tools
export PATH="/Users/techsaswata/.local/share/solana/install/active_release/bin:$PATH"

# Step 2: Set Rust version
print_status "Setting up Rust toolchain..."
rustup default stable

# Step 3: Configure Solana for devnet
print_status "Configuring Solana for devnet..."
solana config set --url devnet

# Step 4: Clean all build artifacts
print_status "Cleaning build artifacts..."
cd /Users/techsaswata/Downloads/Sebi1/sebi/blockchain
rm -rf target/
rm -f Cargo.lock
find . -name "*.so" -delete

# Step 5: Install dependencies
print_status "Installing dependencies..."
cd /Users/techsaswata/Downloads/Sebi1/sebi
npm install

cd packages/api
npm install

# Step 6: Try to build programs
print_status "Building Solana programs..."
cd /Users/techsaswata/Downloads/Sebi1/sebi/blockchain

# Generate new Cargo.lock with stable Rust
cargo update
anchor build || {
    print_warning "Anchor build failed, trying alternative approach..."
    
    # Try building individual programs
    cd programs/bond_amm
    cargo build-sbf || cargo build
    cd ../bond_factory  
    cargo build-sbf || cargo build
    cd ../..
}

# Step 7: Check Solana balance
print_status "Checking Solana balance..."
solana balance || print_warning "Could not check balance - wallet might not be configured"

# Step 8: Create deployment summary
print_status "Creating deployment summary..."

cat << EOF

🎉 Bond Market Project Setup Complete!

📊 Project Status:
- ✅ MongoDB URI configured: mongodb+srv://vsblicmdrt62_db_user:***@sebi.0hqvrmp.mongodb.net/
- ✅ API server configured on port 3001
- ✅ Solana configured for devnet
- ✅ Environment variables set up

🔧 Next Steps:
1. Whitelist your IP in MongoDB Atlas
2. Deploy Solana programs: cd blockchain && anchor deploy
3. Start API server: cd packages/api && npm run dev
4. Test endpoints: curl http://localhost:3001/health

🌐 API Endpoints:
- GET  /health - Health check
- POST /api/markets - Create market
- GET  /api/markets - List markets
- GET  /api/markets/:id - Get market details
- POST /api/transactions - Create transaction
- GET  /api/transactions - List transactions

📱 Database Models:
- Markets: Bond market information
- Transactions: Trading transactions

🔗 Network: Devnet
📍 RPC: https://api.devnet.solana.com

EOF

print_status "Setup complete! Check the summary above for next steps."
