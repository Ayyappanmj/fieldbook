/**
 * Thrown anywhere in the request-handling code; the router's error handler
 * converts it into the matching HTTP response. Mirrors the front-end's own
 * ApiError class so both sides of the stack think about errors the same way.
 */
export class ApiError extends Error {
  /**
   * @param {string} message  Safe to show to the person using the app.
   * @param {number} status   HTTP status code.
   * @param {Record<string,string>} [errors]  Field-level validation messages.
   */
  constructor(message, status = 500, errors = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

export const unauthorized = (message = 'Your session has ended. Sign in again to continue.') => new ApiError(message, 401);
export const notFound = (message = 'That item no longer exists.') => new ApiError(message, 404);
export const validationFailed = (errors) => new ApiError('Some fields need attention.', 422, errors);
