// js/api.js

const API_BASE_URL = 'http://192.168.1.7:5000/api';

const API = {

  // Get stored JWT token
  token() {
    return localStorage.getItem('cv_token');
  },

  // Build request headers
  headers(auth = false) {
    const headers = {
      'Content-Type': 'application/json'
    };

    // Add token if auth required
    if (auth && this.token()) {
      headers['Authorization'] =
        `Bearer ${this.token()}`;
    }

    return headers;
  },

  // Generic request method
  async request(path, method = 'GET', body = null, auth = false) {
    try {

      const options = {
        method,
        headers: this.headers(auth)
      };

      // Add body for POST/PATCH
      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(
        `${API_BASE_URL}${path}`,
        options
      );

      // Handle non-JSON responses safely
      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {
          success: false,
          message: 'Invalid server response'
        };
      }

      // Throw API errors
      if (!response.ok) {
        throw new Error(
          data.message || 'Request failed'
        );
      }

      return data;

    } catch (err) {
      console.error(
        `API ${method} ${path} error:`,
        err
      );

      throw err;
    }
  },

  // GET request
  get(path, auth = false) {
    return this.request(
      path,
      'GET',
      null,
      auth
    );
  },

  // POST request
  post(path, body, auth = false) {
    return this.request(
      path,
      'POST',
      body,
      auth
    );
  },

  // PATCH request
  patch(path, body, auth = false) {
    return this.request(
      path,
      'PATCH',
      body,
      auth
    );
  },

  // DELETE request
  delete(path, auth = false) {
    return this.request(
      path,
      'DELETE',
      null,
      auth
    );
  }
};