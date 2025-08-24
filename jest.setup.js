require('@testing-library/jest-dom');

// Mock cn function
jest.mock('@/lib/utils', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
}));
