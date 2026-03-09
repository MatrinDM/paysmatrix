document.addEventListener('DOMContentLoaded', function() {
  const canvas = document.getElementById('incomeChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const rect = canvas.parentElement.getBoundingClientRect();

  canvas.width = rect.width;
  canvas.height = 300;

  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 10, right: 10, bottom: 10, left: 0 };

  const days = 30;
  const data = new Array(days).fill(0);

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Draw grid lines
  ctx.strokeStyle = '#1e2740';
  ctx.lineWidth = 1;

  for (let i = 0; i <= 10; i++) {
    const y = padding.top + (chartHeight / 10) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  // Draw data line
  ctx.strokeStyle = '#6c5ce7';
  ctx.lineWidth = 2;
  ctx.beginPath();

  for (let i = 0; i < days; i++) {
    const x = padding.left + (chartWidth / (days - 1)) * i;
    const y = height - padding.bottom - (data[i] / 2) * chartHeight;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  // Draw data points
  for (let i = 0; i < days; i++) {
    const x = padding.left + (chartWidth / (days - 1)) * i;
    const y = height - padding.bottom - (data[i] / 2) * chartHeight;

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0e1a';
    ctx.fill();
    ctx.strokeStyle = '#6c5ce7';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Tab switching on finances page
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
    });
  });
});
