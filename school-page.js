function createSchoolTextElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) {
        element.className = className;
    }
    element.textContent = text;
    return element;
}

function createSchoolStat(value, label) {
    const stat = document.createElement('span');
    stat.appendChild(createSchoolTextElement('strong', '', value));
    stat.appendChild(createSchoolTextElement('small', '', label));
    return stat;
}

const schoolPageConfigs = {
    Texas: {
        shortName: 'UT Austin',
        fullName: 'University of Texas at Austin',
        mascot: 'Longhorns',
        campus: 'Austin, TX',
        heroTitle: 'UT Austin gear, ready for the next drop.',
        heroCopy: 'We are building the Longhorn resale rack now. Sell or request Texas hoodies, tees, hats, crewnecks, and campus gear.',
        searchHref: 'index.html#itemsContainer',
        shopCopy: 'Browse all items',
        sellCopy: 'Sell UT gear',
        theme: 'texas'
    },
    Michigan: {
        shortName: 'Michigan',
        fullName: 'University of Michigan',
        mascot: 'Wolverines',
        campus: 'Ann Arbor, MI',
        heroTitle: 'Michigan apparel without the bookstore markup.',
        heroCopy: 'Shop cleaned and inspected Wolverines hoodies, tees, and campus gear as soon as each piece is listed.',
        searchHref: 'index.html?college=Michigan#itemsContainer',
        shopCopy: 'Shop Michigan items',
        sellCopy: 'Sell Michigan gear',
        theme: 'michigan'
    },
    Wisconsin: {
        shortName: 'Wisconsin',
        fullName: 'University of Wisconsin',
        mascot: 'Badgers',
        campus: 'Madison, WI',
        heroTitle: 'Wisconsin gear for Badgers closets.',
        heroCopy: 'Find secondhand Wisconsin tees, hats, hoodies, and campus staples. Availability, pickup, delivery, or shipping is confirmed after inquiry.',
        searchHref: 'index.html?college=Wisconsin#itemsContainer',
        shopCopy: 'Shop Wisconsin items',
        sellCopy: 'Sell Wisconsin gear',
        theme: 'wisconsin'
    }
};

function getSchoolConfig() {
    const schoolKey = document.body.dataset.schoolKey;
    return schoolPageConfigs[schoolKey] || schoolPageConfigs.Michigan;
}

function formatSchoolPrice(price) {
    const data = window.collegeClosetData || {};
    const getPrice = data.getPriceNumber || (value => Number(value) || 0);
    const amount = getPrice(price);
    return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

function getInventoryForSchool(schoolKey) {
    const data = window.collegeClosetData || {};
    return Array.isArray(data.items) ? data.items.filter(item => item.school === schoolKey) : [];
}

function renderSchoolStats(config, inventory) {
    const statsContainer = document.getElementById('schoolStats');
    if (!statsContainer) return;

    const data = window.collegeClosetData || {};
    const getPrice = data.getPriceNumber || (() => 0);
    const prices = inventory.map(item => getPrice(item.resalePrice));
    const lowestPrice = prices.length ? `$${Math.min(...prices)}` : 'Wanted';
    const itemWord = inventory.length === 1 ? 'item' : 'items';

    statsContainer.replaceChildren(
        createSchoolStat(String(inventory.length), `Live ${config.shortName} ${itemWord}`),
        createSchoolStat(lowestPrice, 'Starting price'),
        createSchoolStat('Stripe', 'Secure checkout')
    );
}

function renderFeaturedImages(config, inventory) {
    const media = document.getElementById('schoolHeroMedia');
    if (!media) return;

    const images = inventory.slice(0, 3);
    media.replaceChildren();

    if (!images.length) {
        const wantedCard = document.createElement('div');
        wantedCard.className = 'school-wanted-card';
        wantedCard.appendChild(createSchoolTextElement('span', '', 'Wanted'));
        wantedCard.appendChild(createSchoolTextElement('strong', '', `${config.shortName} hoodies, tees, crewnecks, hats, and vintage finds`));

        const sellerLink = document.createElement('a');
        sellerLink.href = 'sell.html';
        sellerLink.textContent = 'Start seller intake';
        wantedCard.appendChild(sellerLink);
        media.appendChild(wantedCard);
        return;
    }

    images.forEach(item => {
        const figure = document.createElement('figure');
        const image = document.createElement('img');
        image.src = String(item.image || '');
        image.alt = String(item.name || '').trim();
        image.loading = 'eager';

        figure.appendChild(image);
        figure.appendChild(createSchoolTextElement('figcaption', '', formatSchoolPrice(item.resalePrice)));
        media.appendChild(figure);
    });
}

function renderSchoolItems(config, inventory) {
    const itemsContainer = document.getElementById('schoolItems');
    const itemCount = document.getElementById('schoolItemCount');
    if (!itemsContainer) return;

    if (itemCount) {
        itemCount.textContent = inventory.length
            ? `${inventory.length} ${config.shortName} item${inventory.length === 1 ? '' : 's'} available`
            : `${config.shortName} inventory is coming soon`;
    }

    if (!inventory.length) {
        const emptyState = document.createElement('div');
        emptyState.className = 'school-empty-state';
        emptyState.appendChild(createSchoolTextElement('p', 'hero-label', 'Wanted now'));
        emptyState.appendChild(createSchoolTextElement('h2', '', `Have ${config.shortName} gear?`));
        emptyState.appendChild(createSchoolTextElement('p', '', `We do not have ${config.shortName} products listed yet. Send what you have for manual review of cash, store credit, exchange, donation, or pickup options.`));

        const actions = document.createElement('div');
        actions.className = 'hero-actions';

        const sellLink = document.createElement('a');
        sellLink.href = 'sell.html';
        sellLink.className = 'hero-button';
        sellLink.textContent = config.sellCopy;

        const browseLink = document.createElement('a');
        browseLink.href = 'index.html#itemsContainer';
        browseLink.className = 'hero-button hero-button-outline';
        browseLink.textContent = 'Browse all items';

        actions.appendChild(sellLink);
        actions.appendChild(browseLink);
        emptyState.appendChild(actions);
        itemsContainer.replaceChildren(emptyState);
        return;
    }

    itemsContainer.replaceChildren();
    inventory.forEach(item => {
        itemsContainer.appendChild(createProductCard(item));
    });
}

function hydrateSchoolPage() {
    const config = getSchoolConfig();
    const inventory = getInventoryForSchool(document.body.dataset.schoolKey);
    const title = document.getElementById('schoolPageTitle');
    const copy = document.getElementById('schoolPageCopy');
    const schoolName = document.getElementById('schoolName');
    const campus = document.getElementById('schoolCampus');
    const shopLink = document.getElementById('schoolShopLink');
    const sellLink = document.getElementById('schoolSellLink');

    document.body.classList.add(`school-theme-${config.theme}`);

    if (title) title.textContent = config.heroTitle;
    if (copy) copy.textContent = config.heroCopy;
    if (schoolName) schoolName.textContent = config.fullName;
    if (campus) campus.textContent = `${config.mascot} · ${config.campus}`;
    if (shopLink) {
        shopLink.href = config.searchHref;
        shopLink.textContent = config.shopCopy;
    }
    if (sellLink) {
        sellLink.href = 'sell.html';
        sellLink.textContent = config.sellCopy;
    }

    renderSchoolStats(config, inventory);
    renderFeaturedImages(config, inventory);
    renderSchoolItems(config, inventory);
}

document.addEventListener('DOMContentLoaded', hydrateSchoolPage);
