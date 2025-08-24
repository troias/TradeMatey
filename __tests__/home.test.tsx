import { render } from '@testing-library/react';

describe('Basic Component Tests', () => {
  it('should render a component with static content', () => {
    const TestComponent = () => (
      <div data-testid="test-component">
        <h1>Test Heading</h1>
        <p>Test content</p>
      </div>
    );
    
    const { getByTestId, getByText } = render(<TestComponent />);
    
    expect(getByTestId('test-component')).toBeInTheDocument();
    expect(getByText('Test Heading')).toBeInTheDocument();
    expect(getByText('Test content')).toBeInTheDocument();
  });
});
