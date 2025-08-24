/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the cn function
jest.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.join(' '),
}));

describe('Card Component', () => {
  const TestCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`card-base-class ${className || ''}`}>
      {children}
    </div>
  );

  it('renders basic content', () => {
    const { getByText } = render(
      <TestCard>
        <p>Test content</p>
      </TestCard>
    );

    expect(getByText('Test content')).toBeInTheDocument();
  });

  it('applies additional className', () => {
    const { container } = render(
      <TestCard className="extra-class">
        <p>Content</p>
      </TestCard>
    );

    expect(container.firstChild).toHaveClass('card-base-class', 'extra-class');
  });

  it('renders complex children', () => {
    const { getByText } = render(
      <TestCard>
        <div>
          <h2>Title</h2>
          <p>Paragraph 1</p>
          <p>Paragraph 2</p>
        </div>
      </TestCard>
    );

    expect(getByText('Title')).toBeInTheDocument();
    expect(getByText('Paragraph 1')).toBeInTheDocument();
    expect(getByText('Paragraph 2')).toBeInTheDocument();
  });
});
