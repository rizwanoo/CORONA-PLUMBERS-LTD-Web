interface QuoteApiResponse {
  ok: boolean;
  referenceId?: string;
  deliveryMode?: string;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

let cachedCsrfToken = '';

async function fetchCsrfToken(): Promise<string> {
  try {
    const res = await fetch('/api/csrf-token', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return '';
    const data = (await res.json()) as { csrfToken?: string };
    cachedCsrfToken = data.csrfToken || '';
    return cachedCsrfToken;
  } catch {
    return '';
  }
}

function clearFieldErrors(form: HTMLFormElement): void {
  form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
  form.querySelectorAll('.field-error-text').forEach((el) => {
    el.textContent = '';
  });
}

function showFieldError(fieldName: string, message: string): void {
  const input = document.querySelector<HTMLElement>(`[name="${fieldName}"]`);
  if (input) input.classList.add('is-invalid');
  const errEl = document.querySelector<HTMLElement>(`[data-error-for="${fieldName}"]`);
  if (errEl) errEl.textContent = message;
}

function applyServicePreselection(form: HTMLFormElement): void {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('service');
  if (!requested) return;
  const select = form.querySelector<HTMLSelectElement>('select[name="service"]');
  if (!select) return;

  for (const option of Array.from(select.options)) {
    if (option.value.toLowerCase() === requested.toLowerCase()) {
      select.value = option.value;
      break;
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('quoteRequestForm') as HTMLFormElement | null;
  if (!form) return;

  applyServicePreselection(form);
  await fetchCsrfToken();

  const statusBanner = document.getElementById('formStatusBanner');
  const submitButton = document.getElementById('quoteSubmitBtn') as HTMLButtonElement | null;

  form.addEventListener('submit', async (event: SubmitEvent) => {
    event.preventDefault();
    clearFieldErrors(form);

    if (statusBanner) {
      statusBanner.hidden = true;
      statusBanner.className = 'form-status-banner';
      statusBanner.textContent = '';
    }

    const formData = new FormData(form);
    const payload = {
      name: String(formData.get('name') || '').trim(),
      phone: String(formData.get('phone') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      postcode: String(formData.get('postcode') || '').trim().toUpperCase(),
      service: String(formData.get('service') || '').trim(),
      preferredContact: String(formData.get('preferredContact') || '').trim(),
      message: String(formData.get('message') || '').trim(),
      website_url: String(formData.get('website_url') || '').trim(),
    };

    // Quick client-side checks before network call
    let hasClientError = false;
    if (payload.name.length < 2) {
      showFieldError('name', 'Please enter your full name.');
      hasClientError = true;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(payload.email)) {
      showFieldError('email', 'Please enter a valid email address.');
      hasClientError = true;
    }
    if (!/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(payload.postcode)) {
      showFieldError('postcode', 'Please enter a valid UK property postcode (e.g. SW1V 1AA).');
      hasClientError = true;
    }
    if (payload.preferredContact === 'Telephone' && payload.phone.length < 7) {
      showFieldError('phone', 'Please enter a telephone number for a call back.');
      hasClientError = true;
    }
    if (!payload.service) {
      showFieldError('service', 'Please select the type of plumbing issue.');
      hasClientError = true;
    }
    if (payload.message.length < 10) {
      showFieldError('message', 'Please describe the plumbing work required (at least 10 characters).');
      hasClientError = true;
    }

    if (hasClientError) return;

    if (!cachedCsrfToken) {
      await fetchCsrfToken();
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.querySelector('.cta-label')?.replaceChildren('SENDING REQUEST...');
    }

    try {
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': cachedCsrfToken,
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as QuoteApiResponse;

      if (!response.ok || !data.ok) {
        if (data.fieldErrors) {
          Object.entries(data.fieldErrors).forEach(([field, msg]) => {
            showFieldError(field, msg);
          });
        }
        if (statusBanner) {
          statusBanner.hidden = false;
          statusBanner.className = 'form-status-banner is-error';
          statusBanner.textContent =
            data.error || 'Please review the form details and try again.';
        }
        // Refresh token if expired
        if (response.status === 403) {
          await fetchCsrfToken();
        }
        return;
      }

      form.reset();
      await fetchCsrfToken();

      if (statusBanner) {
        statusBanner.hidden = false;
        statusBanner.className = 'form-status-banner is-success';
        statusBanner.innerHTML = `<strong>Request Received (${data.referenceId || 'Logged'})</strong><br>${
          data.message || 'Thank you. Your plumbing quote request has been submitted.'
        }`;
      }
    } catch {
      if (statusBanner) {
        statusBanner.hidden = false;
        statusBanner.className = 'form-status-banner is-error';
        statusBanner.textContent =
          'Network error while submitting your request. Please try again or reach us directly on WhatsApp.';
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.querySelector('.cta-label')?.replaceChildren('SEND QUOTE REQUEST');
      }
    }
  });
});
