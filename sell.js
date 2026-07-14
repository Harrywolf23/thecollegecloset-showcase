const SELLER_CONTACT_EMAIL = 'harrywolf@utexas.edu';
const SELLER_INTAKE_SUBJECT = 'The College Closet — seller intake';

function getFieldValue(form, fieldName) {
    const field = form.elements[fieldName];
    return field && typeof field.value === 'string' ? field.value.trim() : '';
}

function getCheckedValues(form, fieldName) {
    return Array.from(form.querySelectorAll(`input[name="${fieldName}"]:checked`))
        .map((field) => field.value);
}

function getPhotoFiles() {
    const photoInput = document.getElementById('sellerPhotos');
    return photoInput ? Array.from(photoInput.files) : [];
}

function buildSellerMessage(form) {
    const itemTypes = getCheckedValues(form, 'itemTypes');
    const photoFiles = getPhotoFiles();
    const preference = getFieldValue(form, 'preference');

    return [
        'College Closet seller intake',
        `Name: ${getFieldValue(form, 'name')}`,
        `Phone: ${getFieldValue(form, 'phone')}`,
        `School/campus: ${getFieldValue(form, 'school')}`,
        `Pickup/location: ${getFieldValue(form, 'location') || 'Not specified'}`,
        `Item count: ${getFieldValue(form, 'itemCount')}`,
        `Condition: ${getFieldValue(form, 'condition')}`,
        `Items: ${itemTypes.length ? itemTypes.join(', ') : 'Not specified'}`,
        `Preference: ${preference || 'Not specified'}`,
        `Notes: ${getFieldValue(form, 'notes') || 'None'}`,
        `Photos selected: ${photoFiles.length}`,
        'I will attach photos in this text thread before sending.'
    ].join('\n');
}

function setStatus(message, tone = 'neutral') {
    const status = document.getElementById('formStatus');
    if (!status) return;

    status.textContent = message;
    status.dataset.tone = tone;
}

function validateSellerForm(form) {
    if (form.checkValidity()) {
        return true;
    }

    form.reportValidity();
    setStatus('Please complete the required fields first.', 'error');
    return false;
}

function updatePhotoPreview() {
    const preview = document.getElementById('photoPreview');
    const photoFiles = getPhotoFiles();
    if (!preview) return;

    if (!photoFiles.length) {
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = 'No photos selected yet.';
        preview.replaceChildren(emptyMessage);
        return;
    }

    const photoList = document.createElement('ul');
    photoFiles.slice(0, 8).forEach((file) => {
        const item = document.createElement('li');
        item.textContent = file.name;
        photoList.appendChild(item);
    });

    const summary = document.createElement('p');
    summary.textContent = `${photoFiles.length} photo${photoFiles.length === 1 ? '' : 's'} selected for review.`;
    preview.replaceChildren(summary, photoList);

    if (photoFiles.length > 8) {
        const overflow = document.createElement('small');
        overflow.textContent = `Plus ${photoFiles.length - 8} more.`;
        preview.appendChild(overflow);
    }
}

function openSellerEmail(message) {
    const mailtoHref = `mailto:${SELLER_CONTACT_EMAIL}`
        + `?subject=${encodeURIComponent(SELLER_INTAKE_SUBJECT)}`
        + `&body=${encodeURIComponent(message)}`;
    window.location.href = mailtoHref;
}

async function copySellerDetails(message) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(message);
        return;
    }

    const fallback = document.createElement('textarea');
    fallback.value = message;
    fallback.setAttribute('readonly', '');
    fallback.style.position = 'fixed';
    fallback.style.top = '-1000px';
    document.body.appendChild(fallback);
    fallback.select();
    document.execCommand('copy');
    document.body.removeChild(fallback);
}

function setupSellerIntake() {
    const form = document.getElementById('sellerIntakeForm');
    const copyButton = document.getElementById('copyIntakeButton');
    const photoInput = document.getElementById('sellerPhotos');

    if (!form) return;

    if (photoInput) {
        photoInput.addEventListener('change', updatePhotoPreview);
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        if (!validateSellerForm(form)) {
            return;
        }

        const message = buildSellerMessage(form);
        setStatus('Opening your email app. Attach the same photos before sending.', 'success');
        openSellerEmail(message);
    });

    if (copyButton) {
        copyButton.addEventListener('click', async () => {
            if (!validateSellerForm(form)) {
                return;
            }

            try {
                await copySellerDetails(buildSellerMessage(form));
                setStatus(`Seller details copied. Paste them into an email to ${SELLER_CONTACT_EMAIL} and attach photos for manual review.`, 'success');
            } catch (error) {
                setStatus('Copy failed. Please use the email intake button instead.', 'error');
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', setupSellerIntake);
