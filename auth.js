// Authentication functionality for Hrec HR System
(function() {
  'use strict';

  // API Configuration
  const API_BASE = window.location.origin;
  const API_ENDPOINTS = {
    login: '/api/auth/login',
    register: '/api/auth/register',
    profile: '/api/auth/profile',
    updateProfile: '/api/auth/profile',
    logout: '/api/auth/logout'
  };

  // Utility functions
  const utils = {
    // Show error message
    showError: (elementId, message) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.textContent = message;
        element.style.display = 'block';
      }
    },

    // Clear error message
    clearError: (elementId) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.textContent = '';
        element.style.display = 'none';
      }
    },

    // Show auth message
    showAuthMessage: (message, type = 'error') => {
      const messageEl = document.getElementById('authMessage');
      if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = `auth-message ${type}`;
        messageEl.style.display = 'block';
        
        // Auto-hide success messages
        if (type === 'success') {
          setTimeout(() => {
            messageEl.style.display = 'none';
          }, 5000);
        }
      }
    },

    // Clear auth message
    clearAuthMessage: () => {
      const messageEl = document.getElementById('authMessage');
      if (messageEl) {
        messageEl.style.display = 'none';
        messageEl.textContent = '';
      }
    },

    // Set button loading state
    setButtonLoading: (buttonId, loading) => {
      const button = document.getElementById(buttonId);
      if (button) {
        const text = button.querySelector('.btn-text');
        const spinner = button.querySelector('.btn-spinner');
        
        if (loading) {
          button.disabled = true;
          if (text) text.style.opacity = '0';
          if (spinner) spinner.style.display = 'inline';
        } else {
          button.disabled = false;
          if (text) text.style.opacity = '1';
          if (spinner) spinner.style.display = 'none';
        }
      }
    },

    // Validate email
    isValidEmail: (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    },

    // Validate phone number
    isValidPhone: (phone) => {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
    },

    // Check password strength
    checkPasswordStrength: (password) => {
      let score = 0;
      if (password.length >= 8) score++;
      if (/[a-z]/.test(password)) score++;
      if (/[A-Z]/.test(password)) score++;
      if (/[0-9]/.test(password)) score++;
      if (/[^A-Za-z0-9]/.test(password)) score++;
      
      if (score < 3) return 'weak';
      if (score < 5) return 'medium';
      return 'strong';
    },

    // Store token
    storeToken: (token) => {
      localStorage.setItem('hrec_token', token);
    },

    // Get token
    getToken: () => {
      return localStorage.getItem('hrec_token');
    },

    // Remove token
    removeToken: () => {
      localStorage.removeItem('hrec_token');
    },

    // Store user data
    storeUserData: (userData) => {
      localStorage.setItem('hrec_user', JSON.stringify(userData));
    },

    // Get user data
    getUserData: () => {
      const userData = localStorage.getItem('hrec_user');
      return userData ? JSON.parse(userData) : null;
    },

    // Remove user data
    removeUserData: () => {
      localStorage.removeItem('hrec_user');
    },

    // Make API request
    apiRequest: async (url, options = {}) => {
      const token = utils.getToken();
      const config = {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        ...options
      };

      try {
        const response = await fetch(`${API_BASE}${url}`, config);
        let data;
        
        // Try to parse JSON, handle cases where response might not be JSON
        try {
          data = await response.json();
        } catch (parseError) {
          // If response is not JSON, create a generic error
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        if (!response.ok) {
          const errorMessage = data.message || data.error || `Request failed with status ${response.status}`;
          throw new Error(errorMessage);
        }
        
        return data;
      } catch (error) {
        console.error('API Error:', error);
        // Re-throw the error so it can be caught by the calling function
        throw error;
      }
    }
  };

  // Password strength indicator
  function initPasswordStrength() {
    const passwordInput = document.getElementById('password');
    const strengthIndicator = document.getElementById('passwordStrength');
    
    if (passwordInput && strengthIndicator) {
      passwordInput.addEventListener('input', (e) => {
        const password = e.target.value;
        if (password.length === 0) {
          strengthIndicator.className = 'password-strength';
        } else {
          const strength = utils.checkPasswordStrength(password);
          strengthIndicator.className = `password-strength ${strength}`;
        }
      });
    }
  }

  // Password toggle functionality
  function initPasswordToggles() {
    const toggles = document.querySelectorAll('.password-toggle');
    toggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        // Get the button element (handle case where click might be on content)
        const button = e.target.closest('.password-toggle') || e.target;
        // The input is a sibling before the button
        const input = button.previousElementSibling;
        if (input && input.type === 'password') {
          input.type = 'text';
          button.textContent = '🙈';
          button.setAttribute('aria-label', 'Hide password');
        } else if (input && input.type === 'text') {
          input.type = 'password';
          button.textContent = '👁️';
          button.setAttribute('aria-label', 'Show password');
        }
      });
    });
  }

  // Form validation
  function validateForm(formData, isRegistration = false) {
    const errors = {};

    // Email validation
    if (!formData.email || !utils.isValidEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password || formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }

    // Registration-specific validation
    if (isRegistration) {
      // Name validation
      if (!formData.firstName || formData.firstName.trim().length < 1) {
        errors.firstName = 'First name is required';
      }
      if (!formData.lastName || formData.lastName.trim().length < 1) {
        errors.lastName = 'Last name is required';
      }

      // Department validation
      if (!formData.department || formData.department.trim().length < 1) {
        errors.department = 'Department is required';
      }

      // Position validation
      if (!formData.position || formData.position.trim().length < 1) {
        errors.position = 'Position/Job title is required';
      }

      // Phone validation (optional)
      if (formData.phone && !utils.isValidPhone(formData.phone)) {
        errors.phone = 'Please enter a valid phone number';
      }

      // Confirm password validation
      if (!formData.confirmPassword || formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }

      // Terms agreement validation
      if (!formData.agreeTerms) {
        errors.agreeTerms = 'You must agree to the terms and conditions';
      }
    }

    return errors;
  }

  // Display validation errors
  function displayValidationErrors(errors) {
    // Clear all previous errors
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(el => {
      el.textContent = '';
      el.style.display = 'none';
    });

    // Display new errors
    Object.keys(errors).forEach(field => {
      utils.showError(`${field}Error`, errors[field]);
    });
  }

  // Login functionality
  function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      utils.clearAuthMessage();

      const formData = {
        email: form.email.value.trim(),
        password: form.password.value,
        rememberMe: form.rememberMe?.checked || false
      };

      // Validate form
      const errors = validateForm(formData, false);
      if (Object.keys(errors).length > 0) {
        displayValidationErrors(errors);
        return;
      }

      // Clear any previous errors
      const errorElements = document.querySelectorAll('.error-message');
      errorElements.forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
      });

      utils.setButtonLoading('loginBtn', true);

      try {
        const response = await utils.apiRequest(API_ENDPOINTS.login, {
          method: 'POST',
          body: JSON.stringify(formData)
        });

        if (response.success) {
          utils.storeToken(response.data.token);
          utils.storeUserData({
            userId: response.data.userId,
            email: response.data.email,
            firstName: response.data.firstName,
            lastName: response.data.lastName,
            role: response.data.role,
            department: response.data.department,
            position: response.data.position
          });
          
          utils.showAuthMessage('Login successful! Redirecting...', 'success');
          
          // Redirect based on user role
          setTimeout(() => {
            if (response.data.role === 'admin' || response.data.role === 'hr_manager') {
              window.location.href = 'hr.html';
            } else {
              window.location.href = 'index.html';
            }
          }, 1500);
        }
      } catch (error) {
        console.error('Login error:', error);
        utils.showAuthMessage(error.message || 'Login failed. Please try again.');
      } finally {
        utils.setButtonLoading('loginBtn', false);
      }
    });
  }

  // Registration functionality
  function initRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      utils.clearAuthMessage();

      const formData = {
        email: form.email.value.trim(),
        password: form.password.value,
        firstName: form.firstName.value.trim(),
        lastName: form.lastName.value.trim(),
        phone: form.phone.value.trim(),
        department: form.department.value,
        position: form.position.value.trim(),
        confirmPassword: form.confirmPassword.value,
        agreeTerms: form.agreeTerms?.checked || false
      };

      // Validate form
      const errors = validateForm(formData, true);
      if (Object.keys(errors).length > 0) {
        displayValidationErrors(errors);
        return;
      }

      // Clear any previous errors
      const errorElements = document.querySelectorAll('.error-message');
      errorElements.forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
      });

      utils.setButtonLoading('registerBtn', true);

      try {
        const response = await utils.apiRequest(API_ENDPOINTS.register, {
          method: 'POST',
          body: JSON.stringify(formData)
        });

        if (response.success) {
          utils.storeToken(response.data.token);
          utils.storeUserData({
            userId: response.data.userId,
            email: response.data.email,
            firstName: response.data.firstName,
            lastName: response.data.lastName,
            role: response.data.role,
            department: response.data.department,
            position: response.data.position
          });
          
          utils.showAuthMessage('Registration successful! Redirecting...', 'success');
          
          // Redirect to appropriate page
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 1500);
        }
      } catch (error) {
        console.error('Registration error:', error);
        utils.showAuthMessage(error.message || 'Registration failed. Please try again.');
      } finally {
        utils.setButtonLoading('registerBtn', false);
      }
    });
  }

  // Check authentication status
  function checkAuthStatus() {
    const token = utils.getToken();
    if (token) {
      // Verify token is still valid
      utils.apiRequest(API_ENDPOINTS.profile)
        .then(response => {
          // Token is valid, user is logged in
          console.log('User authenticated:', response.data);
        })
        .catch(error => {
          // Token is invalid, remove it
          console.error('Token verification failed:', error);
          utils.removeToken();
          utils.removeUserData();
        });
    }
  }

  // Initialize all functionality
  function init() {
    console.log('🔐 Initializing Hrec authentication system...');
    
    // Initialize password toggles
    initPasswordToggles();
    
    // Initialize password strength indicator
    initPasswordStrength();
    
    // Initialize forms based on current page
    if (document.getElementById('loginForm')) {
      initLoginForm();
    }
    
    if (document.getElementById('registerForm')) {
      initRegisterForm();
    }
    
    // Check authentication status
    checkAuthStatus();
    
    console.log('✅ Hrec authentication system initialized');
  }

  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', init);

  // Export utils for use in other scripts
  window.AuthUtils = utils;

})();
