const React = require('react');
module.exports = {
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  useSegments: jest.fn(() => []),
  Redirect: jest.fn(({ href }) => null),
  Link: jest.fn(({ children, href, ...props }) =>
    React.createElement('Text', { testID: props.testID, ...props }, children)
  ),
  Stack: {
    Screen: jest.fn(() => null),
  },
  Tabs: {
    Screen: jest.fn(() => null),
  },
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
};
