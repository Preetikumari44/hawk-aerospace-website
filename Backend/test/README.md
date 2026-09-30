# HAWK Backend Testing Guide

## Quick Start

### Run All Tests
```bash
npm test
```

### Run Specific Test Types
```bash
npm run test:unit         # Run only unit tests (*.spec.ts)
npm run test:integration  # Run only integration tests (*e2e-spec.ts)
npm run test:functional   # Run functional tests
npm run test:performance  # Run performance/load tests
npm run test:all         # Run all test types in sequence
```

### Development
```bash
npm run test:watch       # Watch mode for TDD
npm run test:cov         # Generate coverage report
```

### CI/CD
```bash
npm run test:ci          # Optimized for CI pipelines
```

---

## Test Structure

```
Backend/
├── src/
│   └── modules/
│       ├── booking/
│       │   └── booking.service.spec.ts      # Unit tests
│       ├── payment/
│       │   └── payment.service.spec.ts      # Unit tests
│       └── ...
└── test/
    ├── booking-flow.e2e-spec.ts            # Integration tests
    ├── functional/
    │   ├── authorization.spec.ts            # RBAC tests
    │   └── data-validation.spec.ts          # Validation tests
    ├── performance/
    │   └── load-test.spec.ts                # Performance tests
    ├── jest-e2e.json                        # E2E config
    └── README.md                            # This file
```

---

## Test Files Overview

### Unit Tests (src/modules/)

#### 1. booking.service.spec.ts
- **Tests:** 18
- **Coverage:** Booking service business logic
- **Key Scenarios:**
  - Create, update, cancel bookings
  - Role-based filtering
  - Date validation
  - Authorization checks

#### 2. payment.service.spec.ts
- **Tests:** 11
- **Coverage:** Payment processing
- **Key Scenarios:**
  - Payment initiation (cash/UPI/wallet)
  - QR code generation
  - Payment confirmation
  - Transaction filtering

### Integration Tests (test/)

#### 3. booking-flow.e2e-spec.ts
- **Tests:** 30+
- **Coverage:** Complete user workflows
- **Key Scenarios:**
  - End-to-end booking lifecycle
  - Cancellation flow
  - Price estimation
  - Multi-user interactions

### Functional Tests (test/functional/)

#### 4. authorization.spec.ts
- **Tests:** 30+
- **Coverage:** RBAC and security
- **Key Scenarios:**
  - Role-based permissions
  - Data isolation
  - Unauthorized access prevention
  - Cross-role access control

#### 5. data-validation.spec.ts
- **Tests:** 25+
- **Coverage:** Input validation
- **Key Scenarios:**
  - Required field validation
  - Type validation
  - Format validation
  - XSS sanitization

### Performance Tests (test/performance/)

#### 6. load-test.spec.ts
- **Tests:** 10+
- **Coverage:** Performance benchmarks
- **Key Scenarios:**
  - Response time validation
  - Concurrent request handling
  - Memory leak detection
  - Database query performance

---

## Prerequisites

### Environment Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Test Database**
   ```bash
   # MongoDB for testing
   docker run -d -p 27017:27017 --name mongo-test mongo:latest
   
   # Or use local MongoDB
   mongod --dbpath ./data/test
   ```

3. **Setup Environment Variables**
   Create `.env.test`:
   ```env
   NODE_ENV=test
   MONGODB_URI=mongodb://localhost:27017/hawk_test
   FIRESTORE_EMULATOR_HOST=localhost:8080
   JWT_SECRET=test-secret-key
   ```

4. **Start Firestore Emulator (Optional)**
   ```bash
   firebase emulators:start --only firestore
   ```

---

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:cov

# Run in watch mode (for development)
npm run test:watch

# Run specific test file
npm test booking.service.spec.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create booking"
```

### Advanced Options

```bash
# Run tests with verbose output
npm test -- --verbose

# Run only failed tests from last run
npm test -- --onlyFailures

# Run tests in parallel (faster)
npm test -- --maxWorkers=4

# Run with debugging
npm test -- --inspect-brk

# Update snapshots (if using snapshot testing)
npm test -- --updateSnapshot
```

---

## Test Configuration

### Jest Configuration (jest.config.ts)
```typescript
export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
```

### E2E Configuration (test/jest-e2e.json)
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "testEnvironment": "node"
}
```

---

## Coverage Reports

### Generate Coverage
```bash
npm run test:cov
```

### View HTML Report
```bash
# Open in browser
open coverage/lcov-report/index.html

# Windows
start coverage/lcov-report/index.html

# Linux
xdg-open coverage/lcov-report/index.html
```

### Coverage Thresholds

Configured in `jest.config.ts`:
```typescript
coverageThreshold: {
  global: {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80,
  },
},
```

---

## Writing New Tests

### Unit Test Template

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ServiceName } from './service-name.service';

describe('ServiceName - Unit Tests', () => {
  let service: ServiceName;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiceName],
    }).compile();

    service = module.get<ServiceName>(ServiceName);
  });

  describe('methodName', () => {
    it('should do something', async () => {
      // Arrange
      const input = { ... };
      
      // Act
      const result = await service.method(input);
      
      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### E2E Test Template

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Feature (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should do something', () => {
    return request(app.getHttpServer())
      .get('/endpoint')
      .expect(200)
      .expect({ ... });
  });
});
```

---

## Mocking

### Mock Services
```typescript
const mockService = {
  method: jest.fn().mockResolvedValue(mockData),
};

// Use in test
const module = await Test.createTestingModule({
  providers: [
    ServiceName,
    { provide: DependencyService, useValue: mockService },
  ],
}).compile();
```

### Mock Firestore
```typescript
const mockFirestore = {
  collection: jest.fn().mockReturnValue({
    doc: jest.fn().mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: () => mockData }),
      set: jest.fn().mockResolvedValue(undefined),
    }),
  }),
};
```

---

## Debugging Tests

### VS Code Launch Configuration

Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": [
    "--runInBand",
    "--no-cache",
    "--watchAll=false",
    "${file}"
  ],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Debug Specific Test
```bash
# Set breakpoint in test file, then run:
npm test -- --inspect-brk booking.service.spec.ts
```

---

## Best Practices

### ✅ Do's
- ✅ Write tests alongside code (TDD)
- ✅ Use descriptive test names
- ✅ Test one thing per test
- ✅ Mock external dependencies
- ✅ Clean up after tests (afterEach)
- ✅ Use async/await properly
- ✅ Test error cases
- ✅ Keep tests independent

### ❌ Don'ts
- ❌ Don't test implementation details
- ❌ Don't create test interdependencies
- ❌ Don't use real databases in unit tests
- ❌ Don't ignore failing tests
- ❌ Don't skip cleanup
- ❌ Don't use arbitrary timeouts
- ❌ Don't test third-party code

---

## Troubleshooting

### Tests Timeout
```typescript
// Increase timeout for slow tests
jest.setTimeout(10000); // 10 seconds
```

### Module Not Found
```bash
# Clear Jest cache
npm test -- --clearCache

# Rebuild
npm run build
```

### Coverage Not Generated
```bash
# Check Jest configuration
# Verify collectCoverageFrom paths
npm run test:cov -- --coverage --verbose
```

### Firestore Tests Fail
```bash
# Start emulator
firebase emulators:start --only firestore

# Or set environment variable
export FIRESTORE_EMULATOR_HOST=localhost:8080
```

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:ci
      
      - name: Upload coverage
        uses: codecov/codecov-action@v2
        with:
          files: ./coverage/lcov.info
```

---

## Performance Benchmarks

| Test Suite | Target Time | Current |
|------------|-------------|---------|
| Unit Tests | <10s | TBD |
| Integration Tests | <30s | TBD |
| Performance Tests | <60s | TBD |
| Full Suite | <2m | TBD |

---

## Resources

### Documentation
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Supertest Documentation](https://github.com/visionmedia/supertest)

### Related Files
- [TEST_DOCUMENTATION.md](../TEST_DOCUMENTATION.md) - Comprehensive testing guide
- [TEST_SUMMARY.md](../TEST_SUMMARY.md) - Test cases summary
- [jest.config.ts](../jest.config.ts) - Jest configuration
- [package.json](../package.json) - Test scripts

---

## Support

For issues or questions:
1. Check this README
2. Review [TEST_DOCUMENTATION.md](../TEST_DOCUMENTATION.md)
3. Check test file comments
4. Review Jest/NestJS documentation

---

**Happy Testing! 🧪✅**
