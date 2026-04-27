import { useSignIn } from '@clerk/clerk-expo';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import SignInScreen from '../sign-in';

// @clerk/clerk-expo is mocked via __mocks__/@clerk/clerk-expo.js

const mockUseSignIn = useSignIn as jest.Mock;

describe('SignInScreen', () => {
  const mockSignInCreate = jest.fn();
  const mockSetActive = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSignIn.mockReturnValue({
      signIn: { create: mockSignInCreate },
      setActive: mockSetActive,
      isLoaded: true,
    });
  });

  it('renders email input, password input and submit button', () => {
    const { getByTestId } = render(<SignInScreen />);
    expect(getByTestId('sign-in-email-input')).toBeTruthy();
    expect(getByTestId('sign-in-password-input')).toBeTruthy();
    expect(getByTestId('sign-in-submit-button')).toBeTruthy();
  });

  it('renders the welcome title', () => {
    const { getByText } = render(<SignInScreen />);
    expect(getByText('Welcome back')).toBeTruthy();
  });

  it('shows an error message when sign-in fails', async () => {
    const clerkError = { errors: [{ message: 'Invalid credentials' }] };
    mockSignInCreate.mockRejectedValueOnce(clerkError);

    const { getByTestId } = render(<SignInScreen />);
    fireEvent.changeText(getByTestId('sign-in-email-input'), 'bad@test.com');
    fireEvent.changeText(getByTestId('sign-in-password-input'), 'wrong');
    fireEvent.press(getByTestId('sign-in-submit-button'));

    await waitFor(() => {
      expect(getByTestId('sign-in-error-text')).toBeTruthy();
    });
  });

  it('calls setActive after a successful sign-in', async () => {
    mockSignInCreate.mockResolvedValueOnce({
      status: 'complete',
      createdSessionId: 'sess-abc',
    });

    const { getByTestId } = render(<SignInScreen />);
    fireEvent.changeText(getByTestId('sign-in-email-input'), 'user@test.com');
    fireEvent.changeText(getByTestId('sign-in-password-input'), 'Password1!');
    fireEvent.press(getByTestId('sign-in-submit-button'));

    await waitFor(() => {
      expect(mockSetActive).toHaveBeenCalledWith({ session: 'sess-abc' });
    });
  });

  it('does not submit when Clerk is not loaded', () => {
    mockUseSignIn.mockReturnValue({
      signIn: { create: mockSignInCreate },
      setActive: mockSetActive,
      isLoaded: false,
    });

    const { getByTestId } = render(<SignInScreen />);
    fireEvent.press(getByTestId('sign-in-submit-button'));
    expect(mockSignInCreate).not.toHaveBeenCalled();
  });

  it('shows forgot password link', () => {
    const { getByTestId } = render(<SignInScreen />);
    expect(getByTestId('sign-in-forgot-password-link')).toBeTruthy();
  });

  it('shows sign up link', () => {
    const { getByTestId } = render(<SignInScreen />);
    expect(getByTestId('sign-in-signup-link')).toBeTruthy();
  });
});
