#!/bin/bash

set -e

# Set the database url environment variable for the tests
export DATABASE_URL="file:./test.db"

# Setup the database schema
pnpm prisma db push --force-reset

# Run tests, and exit with the test results
pnpm jest --coverage --runInBand
