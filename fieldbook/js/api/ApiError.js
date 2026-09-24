/** Error thrown by every API adapter so views can handle failures uniformly. */
export class ApiError extends Error {
  /**
   * @param {string} message  Human-readable, safe to show to the user.
   * @param {number} status   HTTP-like status code (0 = network failure).
   * @param {Record<string,string>} [details]  Field-level validation messages.
   */
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}
