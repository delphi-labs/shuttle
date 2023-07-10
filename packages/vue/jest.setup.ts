// @ts-nocheck

global.console = {
  ...global.console,
  info: jest.fn(),
};
