(() => {
  document.querySelectorAll('[data-consult-topic]').forEach(link => {
    link.addEventListener('click', () => {
      const select = document.querySelector('select[name="상담주제"]');
      if (select) select.value = link.dataset.consultTopic;
    });
  });
  const form = document.querySelector('form[name="contact_form"]');
  if (!form) return;
  const consent = form.querySelector('input[name="개인정보수집동의"]');
  if (consent) {
    // Require fresh consent when the page loads or returns from history.
    const clearConsent = () => { consent.checked = false; };
    clearConsent();
    let consentChanged = false;
    consent.addEventListener('change', () => { consentChanged = true; });
    window.addEventListener('pageshow', event => {
      // Preserve a manual choice made before the initial load finishes.
      if (event.persisted || !consentChanged) clearConsent();
      consentChanged = false;
    });
  }
  const phone = form.querySelector('input[name="연락처"]');
  if (phone) {
    phone.addEventListener('input', () => phone.setCustomValidity(''));
    form.addEventListener('submit', event => {
      const digits = phone.value.replace(/\D/g, '');
      if (digits.length < 8 || digits.length > 15) {
        event.preventDefault();
        phone.setCustomValidity('연락 가능한 전화번호를 확인해 주세요.');
        phone.reportValidity();
      }
    });
  }
})();
