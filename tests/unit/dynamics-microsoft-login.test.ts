import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { parseDynamicsUiAuthMode } from '../../src/utils/dynamics-microsoft-login';

const KEYS = ['DYNAMICS_UI_AUTH_MODE', 'D365_UI_AUTH_MODE'] as const;

describe('dynamics-microsoft-login', () => {
  let snapshot: Partial<Record<(typeof KEYS)[number], string | undefined>>;

  beforeEach(() => {
    snapshot = {};
    for (const k of KEYS) {
      snapshot[k] = process.env[k];
    }
  });

  afterEach(() => {
    for (const k of KEYS) {
      if (snapshot[k] === undefined) delete process.env[k];
      else process.env[k] = snapshot[k];
    }
  });

  it('parseDynamicsUiAuthMode defaults to spn', () => {
    delete process.env.DYNAMICS_UI_AUTH_MODE;
    delete process.env.D365_UI_AUTH_MODE;
    expect(parseDynamicsUiAuthMode()).toBe('spn');
  });

  it('parseDynamicsUiAuthMode reads interactive aliases', () => {
    delete process.env.D365_UI_AUTH_MODE;
    process.env.DYNAMICS_UI_AUTH_MODE = 'INTERACTIVE';
    expect(parseDynamicsUiAuthMode()).toBe('interactive');

    process.env.DYNAMICS_UI_AUTH_MODE = 'password';
    expect(parseDynamicsUiAuthMode()).toBe('interactive');

    delete process.env.DYNAMICS_UI_AUTH_MODE;
    process.env.D365_UI_AUTH_MODE = 'user';
    expect(parseDynamicsUiAuthMode()).toBe('interactive');
  });
});
