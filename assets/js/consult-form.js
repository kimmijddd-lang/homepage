(() => {
  const form = document.querySelector('form[name="contact_form"]');
  if (!form) {
    return;
  }

  // 페이지를 열거나 뒤로가기로 돌아올 때마다 개인정보 동의를 직접 다시 받는다.
  const consent = form.querySelector('input[name="개인정보수집동의"]');
  if (consent) {
    const clearConsent = () => {
      consent.checked = false;
    };
    clearConsent();
    let consentChanged = false;
    consent.addEventListener("change", () => {
      consentChanged = true;
    });
    window.addEventListener("pageshow", (event) => {
      // 최초 로딩 중에 사용자가 직접 체크한 값은 지우지 않는다.
      if (event.persisted || !consentChanged) {
        clearConsent();
      }
      consentChanged = false;
    });
  }

  // 숫자 개수로 한 번 더 확인해 전화번호가 아닌 값을 걸러낸다.
  const phone = form.querySelector('input[name="연락처"]');
  if (phone) {
    phone.addEventListener("input", () => phone.setCustomValidity(""));
    form.addEventListener("submit", (event) => {
      const digits = phone.value.replace(/\D/g, "");
      if (digits.length < 8 || digits.length > 15) {
        event.preventDefault();
        phone.setCustomValidity("연락 가능한 전화번호를 확인해 주세요.");
        phone.reportValidity();
      }
    });
  }
})();
