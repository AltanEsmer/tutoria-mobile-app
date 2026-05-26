const mockSignIn = {
  create: jest.fn(),
};
const mockSetActive = jest.fn();

module.exports = {
  useSignIn: jest.fn(() => ({
    signIn: mockSignIn,
    setActive: mockSetActive,
    isLoaded: true,
  })),
  useSignUp: jest.fn(() => ({
    signUp: { create: jest.fn(), prepareEmailAddressVerification: jest.fn(), attemptEmailAddressVerification: jest.fn() },
    setActive: jest.fn(),
    isLoaded: true,
  })),
  useAuth: jest.fn(() => ({
    isLoaded: true,
    isSignedIn: false,
    userId: null,
    signOut: jest.fn(),
    getToken: jest.fn().mockResolvedValue('mock-token'),
  })),
  useUser: jest.fn(() => ({ user: null, isLoaded: true })),
  ClerkProvider: ({ children }) => children,
};
