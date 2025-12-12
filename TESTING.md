# Testing Guide

This project uses **Jest** for testing both the Frontend (Next.js) and Backend (NestJS).

## Coverage Goal
The target coverage is **75%**. 
Currently, we are building up to this.

## Running Tests

### Frontend (Web)
```bash
cd apps/web
npm run test          # Run all tests
npm run test:watch    # Run in watch mode
npm run test:cov      # Run with coverage report
```

### Backend (API)
```bash
cd apps/api
npm run test          # Run unit tests
npm run test:watch    # Run in watch mode
npm run test:cov      # Run with coverage report
```

## Structure
- **Unit Tests**: Co-located with source files (e.g., `feature.spec.ts` or `page.test.tsx`).
- **Integration Tests**: In `apps/api/test` for API.

## Writing Tests
- **Frontend**: Use `screen` and `render` from `@testing-library/react`. Mock API calls using `jest.mock`.
- **Backend**: Use `Test.createTestingModule` from `@nestjs/testing` to mock providers.

## Coverage Reports
Coverage reports are generated in `coverage/` directory. Open `index.html` to view detailed reports.
