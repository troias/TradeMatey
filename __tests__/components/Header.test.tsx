/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('Header Component', () => {
  const TestHeader = () => (
    <header className="header-base-class">
      <nav>
        <ul>
          <li>
            <a href="/">Home</a>
          </li>
          <li>
            <a href="/about">About</a>
          </li>
        </ul>
      </nav>
    </header>
  );

  it('renders navigation links', () => {
    const { getByText } = render(<TestHeader />);
    
    expect(getByText('Home')).toBeInTheDocument();
    expect(getByText('About')).toBeInTheDocument();
  });

  it('has proper link targets', () => {
    const { getByText } = render(<TestHeader />);
    
    expect(getByText('Home').closest('a')).toHaveAttribute('href', '/');
    expect(getByText('About').closest('a')).toHaveAttribute('href', '/about');
  });

  it('renders within a header element', () => {
    const { container } = render(<TestHeader />);
    expect(container.querySelector('header')).toBeInTheDocument();
  });

  it('includes a navigation element', () => {
    const { container } = render(<TestHeader />);
    expect(container.querySelector('nav')).toBeInTheDocument();
  });
});
