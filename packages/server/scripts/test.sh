#!/bin/bash

set -e

# Set the database url environment variable for the tests
export DATABASE_URL="file:./test.db"

# Generate the Prisma client
pnpm prisma generate

# Check for compilation errors
pnpm tsc --noEmit

# Setup the database schema
pnpm prisma db push --force-reset --skip-generate

# Run tests, and exit with the test results
pnpm jest --coverage --runInBand --verbose "$@"
