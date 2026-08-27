import { HttpErrorResponse } from '@angular/common/http';

import { toApiError } from './api-error';

/**
 * The error mapper is what stands between a raw server failure and the user, so
 * its behaviour is pinned here. It is a pure function - no TestBed needed.
 */
describe('toApiError', () => {
  it('maps a status 0 failure to a network error', () => {
    const error = toApiError(
      new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' }),
    );

    expect(error.kind).toBe('network');
    expect(error.status).toBe(0);
    expect(error.message).toContain('Could not reach the server');
  });

  it('maps a 500 to a generic server message without leaking the response body', () => {
    const error = toApiError(
      new HttpErrorResponse({
        status: 500,
        error: { detail: 'Traceback: secret internal detail' },
      }),
    );

    expect(error.kind).toBe('server');
    expect(error.message).not.toContain('secret internal detail');
  });

  it('surfaces a DRF detail message for client errors', () => {
    const error = toApiError(
      new HttpErrorResponse({ status: 400, error: { detail: 'Language is not supported.' } }),
    );

    expect(error.kind).toBe('client');
    expect(error.message).toBe('Language is not supported.');
  });

  it('collects DRF field validation errors', () => {
    const error = toApiError(
      new HttpErrorResponse({
        status: 400,
        error: { code: ['This field may not be blank.'], language: ['Unsupported.'] },
      }),
    );

    expect(error.fieldErrors).toEqual({
      code: ['This field may not be blank.'],
      language: ['Unsupported.'],
    });
  });

  it('falls back safely for a non-HTTP error', () => {
    const error = toApiError(new Error('boom'));

    expect(error.kind).toBe('unknown');
    expect(error.message).not.toContain('boom');
  });
});
