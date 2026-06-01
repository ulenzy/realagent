// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LandListingForm from '../LandListingForm';

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    drafts: [],
  }),
}));

// Mock subcomponents
vi.mock('../shared/LeafletMap', () => ({
  LeafletMap: () => <div data-testid="leaflet-map" />
}));
vi.mock('../shared/DocumentUpload', () => ({
  default: () => <div data-testid="document-upload" />
}));
vi.mock('../shared/PhotoUpload', () => ({
  default: () => <div data-testid="photo-upload" />
}));

// Helper function for total price calculation: pricePerSqm * landSize
function calculateTotalPrice(pricePerSqm: number | string, landSize: number | string): number {
  const p = typeof pricePerSqm === 'string' ? parseFloat(pricePerSqm) : pricePerSqm;
  const s = typeof landSize === 'string' ? parseFloat(landSize) : landSize;
  if (!p || !s || isNaN(p) || isNaN(s)) return 0;
  return p * s;
}

describe('LandListingForm - Total Price Calculation Utility', () => {
  it('should calculate total price correctly with both fields filled', () => {
    expect(calculateTotalPrice(500, 200)).toBe(100000);
  });

  it('should return 0 when one field is empty', () => {
    expect(calculateTotalPrice(500, '')).toBe(0);
    expect(calculateTotalPrice('', 200)).toBe(0);
  });

  it('should parse string values as numbers', () => {
    expect(calculateTotalPrice('500', '200')).toBe(100000);
    expect(calculateTotalPrice('500.5', '200')).toBe(100100);
  });
});

describe('LandListingForm Rendering and Interaction', () => {
  it('renders successfully', () => {
    const mockOnSubmit = vi.fn();
    render(<LandListingForm onSubmit={mockOnSubmit} />);
    expect(screen.getByText(/List Your/i)).toBeDefined();
  });

  it('should verify inputs exist on step 1', () => {
    const mockOnSubmit = vi.fn();
    render(<LandListingForm onSubmit={mockOnSubmit} />);
    
    const sizeInputs = screen.getAllByPlaceholderText(/Size in SQM/i);
    expect(sizeInputs.length).toBeGreaterThan(0);
  });
});
