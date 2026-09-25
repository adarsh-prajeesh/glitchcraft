document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('library-login-form');
  const loginSection = document.getElementById('login-section');
  const dashboardSection = document.getElementById('dashboard-section');

  const dashName = document.getElementById('dash-name');
  const dashEmail = document.getElementById('dash-email');
  const btnLogout = document.getElementById('btn-library-logout');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('student_email').value;
      const namePart = email.split('@')[0].replace(/\./g, ' ');
      const displayName = namePart.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      dashName.textContent = displayName || 'Verified Identity';
      dashEmail.textContent = email;

      loginSection.style.display = 'none';
      dashboardSection.style.display = 'block';
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      form.reset();
      dashboardSection.style.display = 'none';
      loginSection.style.display = 'block';
    });
  }
});
