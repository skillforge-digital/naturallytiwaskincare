  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealElements = document.querySelectorAll('.reveal');

  if (!reduceMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    revealElements.forEach((element) => observer.observe(element));
  } else {
    revealElements.forEach((element) => element.classList.add('in'));
  }

  const newsletterForm = document.getElementById('newsletter-form');
  const newsletterStatus = document.getElementById('newsletter-status');

  newsletterForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = document.getElementById('email-signup').value.trim();
    newsletterStatus.textContent = email
      ? 'Thanks. You are on the list for routine notes and new launches.'
      : 'Please add your email address to subscribe.';
  });