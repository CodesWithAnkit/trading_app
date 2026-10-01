import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AIInsightsPanel } from './AIInsightsPanel';
import React from 'react';

describe('AIInsightsPanel', () => {
  it('renders insights correctly (covers: AC-4)', () => {
    render(<AIInsightsPanel symbol="RELIANCE" />);
    expect(screen.getByText('AI Insights & Sentiment')).toBeDefined();
    expect(screen.getByText('78.4%')).toBeDefined(); 
    expect(screen.getByText('Long · High Confluence')).toBeDefined();
  });
});
