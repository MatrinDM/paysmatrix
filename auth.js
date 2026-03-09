function checkAuth() {
  if (sessionStorage.getItem('authenticated') !== 'true') {
    window.location.href = 'login.html';
    return;
  }
  loadUserInfo();
}

function loadUserInfo() {
  var email = sessionStorage.getItem('userEmail') || '';
  // Update email display
  var emailEls = document.querySelectorAll('.user-email');
  emailEls.forEach(function(el) { el.textContent = email; });

  // Update avatar initials
  var avatarEls = document.querySelectorAll('.user-avatar');
  var initials = email ? email.substring(0, 2).toUpperCase() : 'US';
  avatarEls.forEach(function(el) { el.textContent = initials; });

  // Fetch balance from server
  fetch('/api/balance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.success) {
      var bal = parseFloat(data.balance) || 0;
      var workBal = parseFloat(data.work_balance) || 0;

      // Update header balance
      var balItems = document.querySelectorAll('.balance-item:not(.locked)');
      balItems.forEach(function(el) { el.innerHTML = '<span class="balance-icon">&#9411;</span> ' + bal.toFixed(2) + ' USDT'; });

      // Update trust balance on finances page
      var trustAmount = document.querySelector('.finance-card.large .finance-amount');
      if (trustAmount) trustAmount.textContent = bal.toFixed(2) + ' USDT';

      // Update work balance on finances page
      var workAmount = document.getElementById('workBalanceAmount');
      if (workAmount) workAmount.textContent = workBal.toFixed(2) + ' USDT';
    }
  })
  .catch(function() {});
}
