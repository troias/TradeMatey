/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('Button Component', () => {
  const TestButton = ({ onClick, disabled, children }: { onClick?: () => void; disabled?: boolean; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`button-base ${disabled ? 'opacity-50' : ''}`}
    >
      {children}
    </button>
  );

  it('renders with text content', () => {
    const { getByRole } = render(<TestButton>Click me</TestButton>);
    const button = getByRole('button');
    expect(button).toHaveTextContent('Click me');
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    const { getByRole } = render(<TestButton onClick={handleClick}>Click me</TestButton>);
    
    fireEvent.click(getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    const handleClick = jest.fn();
    const { getByRole } = render(
      <TestButton onClick={handleClick} disabled>
        Click me
      </TestButton>
    );
    
    const button = getByRole('button');
    expect(button).toBeDisabled();
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies disabled styles', () => {
    const { getByRole } = render(<TestButton disabled>Click me</TestButton>);
    expect(getByRole('button')).toHaveClass('opacity-50');
  });
});
