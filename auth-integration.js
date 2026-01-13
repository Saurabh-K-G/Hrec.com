// Authentication integration for existing Hrec pages
(function() {
  'use strict';

  // Check if user is authenticated
  function checkAuthentication() {
    const token = window.AuthUtils?.getToken() || localStorage.getItem('hrec_token');
    const userData = window.AuthUtils?.getUserData() || JSON.parse(localStorage.getItem('hrec_user') || 'null');

    if (!token || !userData) {
      // User is not authenticated, redirect to login
      window.location.href = 'login.html';
      return false;
    }

    return true;
  }

  // Initialize user menu
  function initUserMenu() {
    const menuToggle = document.getElementById('userMenuToggle');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    const logoutBtn = document.getElementById('logoutBtn');

    if (userName) {
      const userData = window.AuthUtils?.getUserData() || JSON.parse(localStorage.getItem('hrec_user') || 'null');
      if (userData) {
        userName.textContent = userData.firstName || 'User';
      }
    }

    if (menuToggle && userMenu) {
      menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        userMenu.parentElement.classList.toggle('open');
      });

      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!menuToggle.contains(e.target) && !userMenu.contains(e.target)) {
          userMenu.parentElement.classList.remove('open');
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          // Call logout API
          await window.AuthUtils?.apiRequest('/api/auth/logout', {
            method: 'POST'
          });
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Remove token and user data regardless of API response
          if (window.AuthUtils) {
            window.AuthUtils.removeToken();
            window.AuthUtils.removeUserData();
          } else {
            localStorage.removeItem('hrec_token');
            localStorage.removeItem('hrec_user');
          }
          window.location.href = 'login.html';
        }
      });
    }
  }

  // Add user menu styles if not already present
  function addUserMenuStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .user-menu {
        position: relative;
        margin-left: 12px;
      }
      
      .user-menu-toggle {
        background: none;
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 8px 12px;
        color: var(--text);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s ease;
        font-weight: 700;
      }
      
      .user-menu-toggle:hover {
        background: var(--bg);
      }
      
      .dropdown-arrow {
        font-size: 12px;
        transition: transform 0.2s ease;
      }
      
      .user-menu.open .dropdown-arrow {
        transform: rotate(180deg);
      }
      
      .user-menu-dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 8px;
        min-width: 150px;
        display: none;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        margin-top: 4px;
      }
      
      [data-theme="dark"] .user-menu-dropdown {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      }
      
      .user-menu.open .user-menu-dropdown {
        display: block;
      }
      
      .user-menu-dropdown a,
      .user-menu-dropdown button {
        display: block;
        width: 100%;
        padding: 8px 12px;
        text-align: left;
        background: none;
        border: none;
        color: var(--text);
        text-decoration: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.2s ease;
        font-size: 14px;
      }
      
      .user-menu-dropdown a:hover,
      .user-menu-dropdown button:hover {
        background: var(--border);
      }
    `;
    document.head.appendChild(style);
  }

  // Initialize authentication integration
  function init() {
    console.log('🔐 Initializing authentication integration...');
    
    // Add user menu styles
    addUserMenuStyles();
    
    // Check authentication
    if (checkAuthentication()) {
      // Initialize user menu if authenticated
      initUserMenu();
      console.log('✅ User authenticated, menu initialized');
    } else {
      console.log('❌ User not authenticated, redirecting to login');
    }
  }

  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', init);

})();
