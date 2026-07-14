const products = Array.isArray(window.collegeClosetProducts) ? window.collegeClosetProducts : [];
const visibleProducts = products.filter(product => !['hidden', 'sold'].includes(product.status));

const PURCHASE_FORM_BASE = 'https://docs.google.com/forms/d/e/1FAIpQLSfdZkxHDnOzZzx1xqa5f663JWDrUE1kGFgJA8UZy_gj2MlRHw/viewform';
const PURCHASE_FORM_FIELDS = {
    item: 'entry.492708706'
};

function getCollegeName(school) {
    const product = products.find(item => item.school === school);
    return product ? product.schoolDisplayName : school;
}

function formatPrice(price) {
    const amount = Number(price || 0);
    return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

function getPriceNumber(price) {
    if (typeof price === 'number') {
        return price;
    }

    const match = String(price || '').match(/\$?(\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : 0;
}

function getProductDescription(item) {
    return `Size: ${item.size}, ${item.condition}`;
}

function buildInquirySummary(item) {
    return [
        item.name,
        item.schoolDisplayName,
        `Size ${item.size}`,
        item.condition,
        `${formatPrice(item.resalePrice)} manual inquiry price`,
        `Item ID: ${item.id}`
    ].filter(Boolean).join(' | ');
}

function buildPurchaseInquiryUrl(item) {
    const url = new URL(PURCHASE_FORM_BASE);
    url.searchParams.set('usp', 'pp_url');
    url.searchParams.set(PURCHASE_FORM_FIELDS.item, buildInquirySummary(item));
    return url.toString();
}

function createTextElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) {
        element.className = className;
    }
    element.textContent = text;
    return element;
}

function updateItemCount(count, total) {
    const itemCount = document.getElementById('itemCount');

    if (!itemCount) {
        return;
    }

    itemCount.textContent = count === total
        ? `Showing all ${total} items`
        : `Showing ${count} of ${total} items`;
}

// Same strict pattern as scripts/validate-site.js and scripts/payments-core.js —
// a paymentLink must be exactly a Stripe hosted-checkout URL, nothing looser.
const STRIPE_CHECKOUT_PATTERN = /^https:\/\/buy\.stripe\.com\/[A-Za-z0-9_]+$/;

function getCheckoutUrl(item) {
    const link = typeof item.paymentLink === 'string' ? item.paymentLink : '';
    return STRIPE_CHECKOUT_PATTERN.test(link) && item.status === 'available' ? link : '';
}

function createProductCard(item) {
    const itemName = String(item.name || '').trim();
    const imageSrc = String(item.image || '');
    const conditionSlug = String(item.condition || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'unknown';
    const checkoutUrl = getCheckoutUrl(item);

    const itemCard = document.createElement('div');
    itemCard.className = 'item-card';

    const hitLink = document.createElement('a');
    hitLink.href = checkoutUrl || buildPurchaseInquiryUrl(item);
    hitLink.className = 'card-hit-link';
    hitLink.target = '_blank';
    hitLink.rel = 'noopener noreferrer';
    hitLink.setAttribute('aria-label', checkoutUrl ? `Buy ${itemName}` : `Inquire about ${itemName}`);

    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'item-image-wrapper';

    if (item.status === 'held') {
        imageWrapper.appendChild(createTextElement('span', 'status-badge', 'On hold'));
    }

    const image = document.createElement('img');
    image.src = imageSrc;
    image.alt = itemName;
    image.className = 'item-image';
    image.loading = 'lazy';

    imageWrapper.appendChild(image);

    const itemInfo = document.createElement('div');
    itemInfo.className = 'item-info';
    itemInfo.appendChild(createTextElement('span', 'item-school-link', item.schoolDisplayName));
    itemInfo.appendChild(createTextElement('h3', 'item-name', itemName));

    const badges = document.createElement('div');
    badges.className = 'item-badges';

    if (item.condition) {
        const conditionLabel = item.condition.replace('Like New', 'Excellent').replace('Brand New', 'New');
        badges.appendChild(createTextElement('span', `badge badge-condition badge-${conditionSlug}`, conditionLabel));
    }

    if (item.size) {
        badges.appendChild(createTextElement('span', 'badge badge-size', item.size));
    }

    if (item.category) {
        badges.appendChild(createTextElement('span', 'badge badge-size', item.category.replace('-', ' ')));
    }

    const priceContainer = document.createElement('div');
    priceContainer.className = 'price-container';
    priceContainer.appendChild(createTextElement('span', 'resale-price', formatPrice(item.resalePrice)));
    priceContainer.appendChild(createTextElement('span', 'price-note', checkoutUrl ? 'Secure checkout' : 'Manual inquiry'));

    itemInfo.appendChild(badges);
    itemInfo.appendChild(priceContainer);

    if (checkoutUrl) {
        const actions = document.createElement('div');
        actions.className = 'card-actions';
        // The whole card is already the checkout link; this is the visual button.
        actions.appendChild(createTextElement('span', 'buy-button', 'Buy now'));

        const askLink = document.createElement('a');
        askLink.href = buildPurchaseInquiryUrl(item);
        askLink.className = 'ask-link';
        askLink.target = '_blank';
        askLink.rel = 'noopener noreferrer';
        askLink.textContent = 'Ask a question first';
        actions.appendChild(askLink);

        itemInfo.appendChild(actions);
    } else {
        itemInfo.appendChild(createTextElement('span', 'inquiry-link-label', 'Inquire about this item'));
    }
    itemCard.appendChild(hitLink);
    itemCard.appendChild(imageWrapper);
    itemCard.appendChild(itemInfo);

    return itemCard;
}

function displayItems(itemsToDisplay) {
    const itemsContainer = document.getElementById('itemsContainer');

    if (!itemsContainer) {
        return;
    }

    itemsContainer.replaceChildren();
    updateItemCount(itemsToDisplay.length, visibleProducts.length);

    if (itemsToDisplay.length === 0) {
        itemsContainer.replaceChildren(
            createTextElement('p', 'no-results', 'No items found. Try a different school, size, or item name.')
        );
        return;
    }

    itemsToDisplay.forEach(item => {
        itemsContainer.appendChild(createProductCard(item));
    });
}

function sortItems(itemsToSort, sortValue) {
    const sortedItems = [...itemsToSort];

    if (sortValue === 'price-low') {
        sortedItems.sort((a, b) => getPriceNumber(a.resalePrice) - getPriceNumber(b.resalePrice));
    }

    if (sortValue === 'price-high') {
        sortedItems.sort((a, b) => getPriceNumber(b.resalePrice) - getPriceNumber(a.resalePrice));
    }

    if (sortValue === 'school') {
        sortedItems.sort((a, b) => a.schoolDisplayName.localeCompare(b.schoolDisplayName));
    }

    return sortedItems;
}

function handleSearch() {
    const itemsContainer = document.getElementById('itemsContainer');
    const searchInput = document.getElementById('searchInput');
    const navSearchInput = document.getElementById('navSearchInput');
    const collegeFilter = document.getElementById('collegeFilter');
    const sortSelect = document.getElementById('sortSelect');
    const categoryFilter = document.getElementById('categoryFilter');
    const sizeFilter = document.getElementById('sizeFilter');
    const conditionFilter = document.getElementById('conditionFilter');
    const priceFilter = document.getElementById('priceFilter');
    const clearFilters = document.getElementById('clearFilters');
    const schoolOptions = Array.from(document.querySelectorAll('input[name="schoolOption"]'));

    if (!itemsContainer || !searchInput || !collegeFilter) {
        return;
    }

    function filterItems() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        const selectedCollege = collegeFilter.value;
        const selectedSort = sortSelect ? sortSelect.value : 'featured';
        const selectedCategory = categoryFilter ? categoryFilter.value : '';
        const selectedSize = sizeFilter ? sizeFilter.value : '';
        const selectedCondition = conditionFilter ? conditionFilter.value : '';
        const selectedPrice = priceFilter ? priceFilter.value : '';

        const filteredItems = visibleProducts.filter(item => {
            const searchable = [
                item.name,
                item.schoolDisplayName,
                item.school,
                item.category,
                item.size,
                item.condition,
                item.brand,
                formatPrice(item.resalePrice),
                item.id
            ].join(' ').toLowerCase();
            const resalePrice = getPriceNumber(item.resalePrice);
            const matchesSearch = searchTerm === '' || searchable.includes(searchTerm);
            const matchesCollege = selectedCollege === '' || item.school === selectedCollege;
            const matchesCategory = selectedCategory === '' || item.category === selectedCategory;
            const matchesSize = selectedSize === '' || item.size === selectedSize;
            const matchesCondition = selectedCondition === '' || item.condition === selectedCondition;
            const matchesPrice =
                selectedPrice === '' ||
                (selectedPrice === 'under-15' && resalePrice < 15) ||
                (selectedPrice === '15-25' && resalePrice >= 15 && resalePrice <= 25) ||
                (selectedPrice === '25-plus' && resalePrice > 25);

            return matchesSearch && matchesCollege && matchesCategory && matchesSize && matchesCondition && matchesPrice;
        });

        displayItems(sortItems(filteredItems, selectedSort));
    }

    searchInput.addEventListener('input', filterItems);
    if (navSearchInput) {
        navSearchInput.addEventListener('input', () => {
            searchInput.value = navSearchInput.value;
            filterItems();
        });

        searchInput.addEventListener('input', () => {
            navSearchInput.value = searchInput.value;
        });
    }
    collegeFilter.addEventListener('change', filterItems);
    schoolOptions.forEach(option => {
        option.addEventListener('change', () => {
            collegeFilter.value = option.value;
            filterItems();
        });
    });
    if (sortSelect) {
        sortSelect.addEventListener('change', filterItems);
    }
    [categoryFilter, sizeFilter, conditionFilter, priceFilter].forEach(filter => {
        if (filter) {
            filter.addEventListener('change', filterItems);
        }
    });
    if (clearFilters) {
        clearFilters.addEventListener('click', () => {
            searchInput.value = '';
            if (navSearchInput) {
                navSearchInput.value = '';
            }
            collegeFilter.value = '';
            [categoryFilter, sizeFilter, conditionFilter, priceFilter].forEach(filter => {
                if (filter) {
                    filter.value = '';
                }
            });
            const allSchools = schoolOptions.find(option => option.value === '');
            if (allSchools) {
                allSchools.checked = true;
            }
            filterItems();
        });
    }

    const params = new URLSearchParams(window.location.search);
    const initialCollege = params.get('college');

    if (initialCollege && Array.from(collegeFilter.options).some(option => option.value === initialCollege)) {
        collegeFilter.value = initialCollege;
        const matchingSchoolOption = schoolOptions.find(option => option.value === initialCollege);

        if (matchingSchoolOption) {
            matchingSchoolOption.checked = true;
        }
    }

    filterItems();
}

window.collegeClosetData = {
    items: visibleProducts,
    products: visibleProducts,
    getCollegeName,
    getPriceNumber,
    getProductDescription,
    buildPurchaseInquiryUrl
};

document.addEventListener('DOMContentLoaded', () => {
    handleSearch();
});
