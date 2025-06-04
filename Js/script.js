let cart = JSON.parse(localStorage.getItem('cart')) || [];
let products = [];
let currentProduct = null;
let categories = [];
// Variables para control del scroll
let lastScrollPosition = 0;
const headerHeight = document.querySelector('.header').offsetHeight;
const header = document.querySelector('.header');

// Función para ir al inicio
function goToHome() {
    window.location.hash = '';
    hideProductDetail();
    renderProducts();
    toggleCarousel(true);
}

// Manejo del historial con hash
window.addEventListener('popstate', handleRouteChange);
window.addEventListener('hashchange', handleRouteChange);

function handleRouteChange() {
    const productName = decodeURIComponent(window.location.hash.substring(1));
    if (!productName) {
        hideProductDetail();
    } else {
        showProductDetail(productName);
    }
}

// Cargar productos
async function loadProducts() {
    try {
        const response = await fetch('Json/products.json');
        if (!response.ok) throw new Error('Error al cargar productos');
        const data = await response.json();
        
        const productGroups = {};
        
        data.products.forEach(product => {
            if (product.tipo === 'pack') {
                products.push({
                    ...product,
                    id: `pack_${product.nombre.replace(/\s+/g, '_')}`,
                    isPack: true,
                    cleanName: product.nombre
                });
                return;
            }
            
            const baseName = product.nombre.split('(')[0].trim();
            const variantName = product.nombre.match(/\((.*?)\)/)?.[1] || '';
            
            if (!productGroups[baseName]) {
                productGroups[baseName] = {
                    baseName: baseName,
                    variants: []
                };
            }
            
            productGroups[baseName].variants.push({
                ...product,
                cleanName: product.nombre.replace(/\(v\d+\)\s*/g, ''),
                variantName: variantName
            });
        });
        
        for (const baseName in productGroups) {
            const group = productGroups[baseName];
            
            if (group.variants.length > 1) {
                products.push({
                    ...group.variants[0], // Usa el primer variante como base para el grupo
                    id: `group_${baseName.replace(/\s+/g, '_')}`, // Asegura un ID único
                    isGrouped: true,
                    baseName: baseName,
                    variants: group.variants,
                    currentVariant: 0, // Índice de la variante actual
                    // Hereda otras propiedades importantes del primer variante si es necesario
                    nombre: group.variants[0].nombre, // Nombre inicial del grupo (puede ser el del primer variante)
                    descripcion: group.variants[0].descripcion,
                    categoria: group.variants[0].categoria,
                    // No heredes precio directamente aquí, se tomará de la variante actual
                });
            } else {
                products.push(group.variants[0]);
            }
        }
        
        const uniqueCategories = new Set(products.map(product => product.categoria));
        categories = ['Todo', ...uniqueCategories];
        
        renderCategories();
        initPriceFilter();

        // --- ORDEN DE RENDERIZADO CORREGIDO ---
        renderTopProducts(); // 1. Renderizar Los Más Vendidos primero
        renderPacksPanel();  // 2. Renderizar Packs Especiales después de Los Más Vendidos
        renderProducts();    // 3. Renderizar la cuadrícula principal de productos
        // --- FIN DEL ORDEN DE RENDERIZADO CORREGIDO ---
        
        updateCartCount();
        updateCart();
        
        if (window.location.hash) {
            handleRouteChange();
        }

        document.getElementById('close-sidebar')?.addEventListener('click', toggleSidebar);
        document.getElementById('menu-toggle')?.addEventListener('click', toggleSidebar);
        // Corregido: el overlay se crea dinámicamente, el listener se añade al crearlo o se usa event delegation.
        // document.getElementById('overlay')?.addEventListener('click', toggleSidebar); // Este overlay se crea en toggleSidebar
    } catch (error) {
        console.error('Error en loadProducts:', error);
        // Considera mostrar un mensaje de error más amigable al usuario en la UI
        // alert('Error al cargar los productos. Por favor recarga la página.'); 
    }
}

function handleScroll() {
    const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    
    // Si estamos en la parte superior, mostrar siempre el header
    if (currentScrollPosition <= 0) {
        header.classList.remove('hidden');
        return;
    }
    
    // Si el scroll es mayor que la altura del header
    if (currentScrollPosition > headerHeight) {
        // Scroll hacia abajo
        if (currentScrollPosition > lastScrollPosition) {
            header.classList.add('hidden');
        } 
        // Scroll hacia arriba
        else {
            header.classList.remove('hidden');
        }
    }
    
    lastScrollPosition = currentScrollPosition;
}

// Evento de scroll optimizado con debounce
let isScrolling;
window.addEventListener('scroll', function() {
    window.clearTimeout(isScrolling);
    isScrolling = setTimeout(handleScroll, 30);
}, false);

// Asegurarse de que el header esté visible al cargar la página
window.addEventListener('load', function() {
    header.classList.remove('hidden');
});

function renderPacksPanel() {
    const packs = products.filter(product => product.isPack);
    const mainContent = document.getElementById('main-content');

    if (!mainContent) {
        console.error("Elemento #main-content no encontrado para renderPacksPanel.");
        return;
    }
    
    // Eliminar panel existente si lo hay
    const existingPanel = document.getElementById('packs-section');
    if (existingPanel) existingPanel.remove();

    if (packs.length === 0) {
        return; // No renderizar nada si no hay packs
    }

    const packsSection = document.createElement('div');
    packsSection.id = 'packs-section';
    packsSection.className = 'packs-section';
    packsSection.innerHTML = `
        <div class="packs-header">
            <h2 class="packs-title"><i class="fas fa-box-open"></i> Packs Especiales</h2>
            <div class="packs-controls">
                <button class="packs-scroll-btn packs-prev-btn" onclick="scrollPacks(-1)" disabled>
                    <i class="fas fa-chevron-left"></i>
                </button>
                <button class="packs-scroll-btn packs-next-btn" onclick="scrollPacks(1)">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
        <div class="packs-container" id="packs-container"></div>
    `;

    const topProductsSection = document.getElementById('top-products-section');
    
    // Insertar la sección de packs después de la sección de "top products" si existe,
    // o al principio del mainContent si "top products" no existe.
    if (topProductsSection && topProductsSection.parentNode === mainContent) {
        mainContent.insertBefore(packsSection, topProductsSection.nextSibling);
    } else {
        mainContent.insertBefore(packsSection, mainContent.firstChild);
    }

    const packsContainer = document.getElementById('packs-container');
    if(!packsContainer) {
        console.error("Elemento #packs-container no encontrado dentro de #packs-section.");
        return;
    }
    packs.forEach(pack => {
        const isOnSale = pack.oferta && pack.descuento > 0;
        const finalPrice = isOnSale 
            ? (pack.precio * (1 - pack.descuento/100)).toFixed(2)
            : pack.precio.toFixed(2);

        const maxItemsToShow = 3;
        const itemsToShow = pack.productos.slice(0, maxItemsToShow);
        const remainingItems = pack.productos.length - maxItemsToShow;

        const packEl = document.createElement('div');
        packEl.className = 'pack-card';
        packEl.innerHTML = `
            <div class="pack-badge">PACK</div>
            ${pack.ahorro ? `<div class="pack-savings">Ahorras $${pack.ahorro.toFixed(2)}</div>` : ''}
            <div class="pack-image-container">
                <img src="Images/products/${pack.imagenes[0]}" 
                    class="pack-image" 
                    alt="${pack.nombre}"
                    onclick="showProductDetail('${encodeURIComponent(pack.nombre)}')">
            </div>
            <div class="pack-info">
                <h3 class="pack-title" onclick="showProductDetail('${encodeURIComponent(pack.nombre)}')">
                    ${pack.nombre}
                </h3>
                <div class="pack-price-container">
                    ${isOnSale ? `
                        <span class="pack-original-price">$ ${pack.precio.toFixed(2)}</span>
                        <span class="pack-discount-percent">-${pack.descuento}%</span>
                    ` : ''}
                    <span class="pack-current-price">$ ${finalPrice}</span>
                </div>
                <div class="pack-contents">
                    <div class="pack-contents-title">
                        <i class="fas fa-box-open"></i> Contenido:
                    </div>
                    <ul class="pack-contents-list">
                        ${itemsToShow.map(item => `<li>${item}</li>`).join('')}
                        ${remainingItems > 0 ? `<li class="remaining-items">+${remainingItems} productos más</li>` : ''}
                    </ul>
                </div>
                <div class="pack-footer">
                    <div class="pack-quantity-section">
                        <div class="pack-quantity-controls">
                            <button class="pack-quantity-btn" onclick="adjustPackQuantity(this, -1, '${pack.nombre.replace(/'/g, "\\'")}', event)">
                                <i class="fas fa-minus"></i>
                            </button>
                            <span class="pack-quantity" id="pack-quantity-${pack.nombre.replace(/'/g, "\\'")}">1</span>
                            <button class="pack-quantity-btn" onclick="adjustPackQuantity(this, 1, '${pack.nombre.replace(/'/g, "\\'")}', event)">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <button class="add-pack-to-cart" onclick="addToCart('${pack.nombre.replace(/'/g, "\\'")}', false, event)">
                            <i class="fas fa-cart-plus"></i>
                            <span>Añadir</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        packsContainer.appendChild(packEl);
    });

    packsContainer.addEventListener('scroll', updatePacksScrollButtons);
    updatePacksScrollButtons(); // Llamar para estado inicial de botones
}

// Nueva función para ajustar cantidad en packs
function adjustPackQuantity(btn, change, productName, event) {
    if (event) event.stopPropagation();
    const quantityElement = document.getElementById(`pack-quantity-${productName}`);
    if (quantityElement) {
        let quantity = parseInt(quantityElement.textContent) || 1;
        quantity = Math.max(1, quantity + change);
        quantityElement.textContent = quantity;
    }
}
function scrollPacks(direction) {
    const packsContainer = document.getElementById('packs-container');
    if (!packsContainer) return;
    
    const scrollAmount = packsContainer.clientWidth * 0.8;
    packsContainer.scrollBy({
        left: direction * scrollAmount,
        behavior: 'smooth'
    });
}

function updatePacksScrollButtons() {
    const packsContainer = document.getElementById('packs-container');
    if (!packsContainer) return;
    
    const prevBtn = document.querySelector('.packs-prev-btn');
    const nextBtn = document.querySelector('.packs-next-btn');
    
    if (!prevBtn || !nextBtn) return;
    
    prevBtn.disabled = packsContainer.scrollLeft <= 10;
    nextBtn.disabled = packsContainer.scrollWidth <= packsContainer.clientWidth + packsContainer.scrollLeft + 10;
}
function renderCategories() {
    const sidebarCategories = document.getElementById('sidebar-categories');
    const desktopCategories = document.getElementById('categories-list');
    
    const categoryItems = categories.map(category => `
        <li onclick="filterByCategory('${category}')">
            <i class="fas fa-${getCategoryIcon(category)}"></i>
            ${category}
        </li>
    `).join('');
    
    if (sidebarCategories) sidebarCategories.innerHTML = categoryItems;
    if (desktopCategories) desktopCategories.innerHTML = categoryItems;
}
function getCategoryIcon(category) {
    const icons = {
        'todo': 'th-large',
        'electrónica': 'mobile-alt',
        'comida': 'utensils',
        'bebidas': 'wine-glass-alt',
        'postres': 'cookie-bite',
        'frutas': 'apple-alt',
        'verduras': 'carrot',
        'carnes': 'drumstick-bite',
        'pescado': 'fish',
        'panadería': 'bread-slice',
        'lácteos': 'cheese',
        'cafetería': 'coffee',
        'rápida': 'hamburger',
        'despensa': 'shopping-basket',
        'snacks': 'pizza-slice',
        'combos': 'box-open' // Nuevo icono para combos
    };

    return icons[category.toLowerCase().trim()] || 'tag';
}


function initPriceFilter() {
    const minPriceInput = document.getElementById('min-price');
    const maxPriceInput = document.getElementById('max-price');
    const minPriceSlider = document.getElementById('price-slider-min');
    const maxPriceSlider = document.getElementById('price-slider-max');
    const applyFilterBtn = document.getElementById('apply-price-filter');
    
    if (!minPriceInput || !maxPriceInput || !minPriceSlider || !maxPriceSlider) return;
    
    // Valores iniciales basados en los productos
    const prices = products.map(p => p.precio);
    const minPrice = Math.floor(Math.min(...prices));
    const maxPrice = Math.ceil(Math.max(...prices));
    
    // Configurar sliders
    minPriceSlider.min = minPrice;
    minPriceSlider.max = maxPrice;
    minPriceSlider.value = minPrice;
    
    maxPriceSlider.min = minPrice;
    maxPriceSlider.max = maxPrice;
    maxPriceSlider.value = maxPrice;
    
    // Set initial input values
    minPriceInput.value = minPrice;
    maxPriceInput.value = maxPrice;
    
    // Update slider track initially
    updatePriceSlider();
    
    // Actualizar inputs cuando se mueven los sliders
    minPriceSlider.addEventListener('input', () => {
        minPriceInput.value = minPriceSlider.value;
        updatePriceSlider();
    });
    
    maxPriceSlider.addEventListener('input', () => {
        maxPriceInput.value = maxPriceSlider.value;
        updatePriceSlider();
    });
    
    // Actualizar sliders cuando se editan los inputs
    minPriceInput.addEventListener('change', () => {
        let value = Math.max(minPrice, Math.min(maxPrice, parseInt(minPriceInput.value) || minPrice));
        minPriceSlider.value = value;
        minPriceInput.value = value;
        updatePriceSlider();
    });
    
    maxPriceInput.addEventListener('change', () => {
        let value = Math.max(minPrice, Math.min(maxPrice, parseInt(maxPriceInput.value) || maxPrice));
        maxPriceSlider.value = value;
        maxPriceInput.value = value;
        updatePriceSlider();
    });
    
    // Aplicar filtros
    applyFilterBtn.addEventListener('click', applyPriceFilter);
    
    // Función para actualizar el track del slider
    function updatePriceSlider() {
        const minVal = parseInt(minPriceSlider.value);
        const maxVal = parseInt(maxPriceSlider.value);
        
        // Prevent sliders from crossing
        if (minVal > maxVal) {
            minPriceSlider.value = maxVal;
            minPriceInput.value = maxVal;
        } else if (maxVal < minVal) {
            maxPriceSlider.value = minVal;
            maxPriceInput.value = minVal;
        }
        
        const track = document.querySelector('.price-slider-track');
        if (track) {
            const minPercent = ((minPriceSlider.value - minPrice) / (maxPrice - minPrice)) * 100;
            const maxPercent = ((maxPriceSlider.value - minPrice) / (maxPrice - minPrice)) * 100;
            
            track.style.left = `${minPercent}%`;
            track.style.width = `${maxPercent - minPercent}%`;
        }
    }
    
    // Función para aplicar filtros
    function applyPriceFilter() {
        const minPrice = parseInt(minPriceInput.value) || 0;
        const maxPrice = parseInt(maxPriceInput.value) || Infinity;
        
        const filteredProducts = products.filter(product => {
            const finalPrice = product.oferta && product.descuento > 0 
                ? product.precio * (1 - product.descuento / 100)
                : product.precio;
            return finalPrice >= minPrice && finalPrice <= maxPrice;
        });
        
        renderProducts(filteredProducts);
        closeSidebar();
    }
}

function filterByCategory(category) {
    hideNoResultsMessage();
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    
    if (document.getElementById('product-detail')?.style.display === 'block') {
        hideProductDetail();
    }
    
    // Mostrar u ocultar panel de packs según la categoría seleccionada
    const packsSection = document.getElementById('packs-section');
    if (packsSection) {
        packsSection.style.display = category === 'Todo' || category === 'Combos' ? 'block' : 'none';
    }
    
    const filteredProducts = category === 'Todo' 
        ? products 
        : products.filter(product => product.categoria === category);
    
    renderProducts(filteredProducts);
    
    if (window.innerWidth <= 768) {
        closeSidebar();
    }
}

// Buscar productos (ahora en tiempo real)
function searchProducts() {
    const searchInput = document.getElementById('search-input');
    const productsContainer = document.getElementById('products-container');
    
    if (!searchInput || !productsContainer) return;
    
    toggleCarousel(false);

    if (document.getElementById('product-detail')?.style.display === 'block') {
        hideProductDetail();
    }
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    // Ocultar panel de packs durante la búsqueda
    const packsSection = document.getElementById('packs-section');
    if (packsSection) packsSection.style.display = 'none';
    
    if (!searchTerm) {
        renderProducts();
        // Mostrar packs solo si estamos en categoría Todo o Combos
        const currentCategory = document.querySelector('#categories-list li[style="color: var(--dorado);"]')?.textContent;
        if (currentCategory === 'Todo' || currentCategory === 'Combos') {
            renderPacksPanel();
        }
        hideNoResultsMessage();
        toggleCarousel(true);
        return;
    }
    
    const filteredProducts = products.filter(product => 
        product.nombre.toLowerCase().includes(searchTerm) || 
        product.descripcion.toLowerCase().includes(searchTerm) ||
        product.categoria.toLowerCase().includes(searchTerm)
    );
    
    if (filteredProducts.length > 0) {
        renderProducts(filteredProducts);
        hideNoResultsMessage();
    } else {
        productsContainer.innerHTML = '';
        showNoResultsMessage(searchTerm);
    }
}

function showNoResultsMessage(searchTerm) {
    let noResultsMessage = document.getElementById('no-results-message');
    // Actualizar el mensaje existente
    noResultsMessage.querySelector('.no-results-term').textContent = searchTerm;
    noResultsMessage.style.display = 'block';
}

function hideNoResultsMessage() {
    const noResultsMessage = document.getElementById('no-results-message');
    if (noResultsMessage) {
        noResultsMessage.style.display = 'none';
    }
}

// Función para limpiar la búsqueda
function clearSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }
    renderProducts();
    hideNoResultsMessage();
}

function toggleSidebar() {
    if (window.innerWidth > 768) return;
    
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    
    if (!sidebar) return;

    const isOpening = !sidebar.classList.contains('active');
    
    closeCart();
    
    sidebar.classList.toggle('active');
    document.body.classList.toggle('sidebar-open', isOpening);

    if (isOpening) {
        header.classList.remove('hidden');
    }

    // Manejar el overlay
    if (isOpening) {
        if (!sidebarOverlay) {
            const overlay = document.createElement('div');
            overlay.id = 'sidebar-overlay';
            overlay.className = 'sidebar-overlay';
            overlay.onclick = closeSidebar;
            document.body.appendChild(overlay);
            setTimeout(() => overlay.classList.add('active'), 10);
        } else {
            sidebarOverlay.classList.add('active');
        }
    } else {
        closeSidebar();
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    
    if (sidebar && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        document.body.classList.remove('sidebar-open');
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.classList.remove('active');
        setTimeout(() => {
            if (sidebarOverlay && !sidebarOverlay.classList.contains('active')) {
                sidebarOverlay.remove();
            }
        }, 300);
    }
}

// Mostrar modal de carrito vacío
function showEmptyCartModal() {
    const modal = document.getElementById('empty-cart-modal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

// Cerrar modal de carrito vacío
function closeEmptyCartModal() {
    const modal = document.getElementById('empty-cart-modal');
    if (!modal) return;
    
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// Renderizar productos con precios corregidos
function renderProducts(productsToRender = products) {
    const container = document.getElementById('products-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Filtrar productos que no son packs
    const regularProducts = productsToRender.filter(product => !product.isPack);
    
    if (regularProducts.length === 0) {
        container.innerHTML = `
            <div class="no-results-container">
                <div class="no-results-content">
                    <i class="fas fa-search no-results-icon"></i>
                    <h3 class="no-results-title">No encontramos productos</h3>
                    <button class="clear-search-btn" onclick="renderProducts()">
                        <i class="fas fa-times"></i> Mostrar todos los productos
                    </button>
                </div>
            </div>
        `;
        return;
    }

    // Agrupar productos por categoría
    const productsByCategory = {};
    regularProducts.forEach(product => {
        if (!productsByCategory[product.categoria]) {
            productsByCategory[product.categoria] = [];
        }
        productsByCategory[product.categoria].push(product);
    });

    // Renderizar cada categoría
    Object.keys(productsByCategory).forEach((category, index) => {
        const categoryProducts = productsByCategory[category];
        
        // Crear contenedor de categoría
        const categoryContainer = document.createElement('div');
        categoryContainer.className = 'category-container';
        categoryContainer.innerHTML = `
            <h2 class="category-title">
                <i class="fas fa-${getCategoryIcon(category)}"></i>
                ${category}
            </h2>
            <div class="category-products-grid" id="category-${category.replace(/\s+/g, '-')}"></div>
        `;
        
        container.appendChild(categoryContainer);
        
        // Renderizar productos de esta categoría
        const productsGrid = categoryContainer.querySelector('.category-products-grid');
        categoryProducts.forEach(product => {
            const displayProduct = product.isGrouped ? product.variants[product.currentVariant] : product;
            const cleanName = displayProduct.nombre.replace(/'/g, "\\'");
            
            const productEl = document.createElement('div');
            productEl.className = 'product-card';
            
            const isOnSale = displayProduct.oferta && displayProduct.descuento > 0;
            const finalPrice = isOnSale 
                ? (displayProduct.precio * (1 - displayProduct.descuento/100)).toFixed(2)
                : displayProduct.precio.toFixed(2);

            // Miniaturas de variantes
            const variantThumbnails = product.isGrouped ? `
                <div class="variant-thumbnails-container">
                    <div class="variant-thumbnails">
                        ${product.variants.map((variant, index) => `
                            <div class="variant-thumb ${index === product.currentVariant ? 'active' : ''}" 
                                 onclick="changeProductVariant(this, '${product.baseName}', ${index}, event)">
                                <img src="Images/products/${variant.imagenes[0]}" alt="${variant.variantName}">
                                <span class="variant-tooltip">${variant.variantName}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : '';

            productEl.innerHTML = `
                <div class="product-image-container">
                    <div class="product-badges">
                        ${displayProduct.nuevo ? '<span class="badge nuevo"><i class="fas fa-star"></i> NUEVO</span>' : ''}
                        ${displayProduct.oferta ? '<span class="badge oferta"><i class="fas fa-tag"></i> OFERTA</span>' : ''}
                        ${displayProduct.mas_vendido ? '<span class="badge mas-vendido"><i class="fas fa-trophy"></i> TOP</span>' : ''}
                    </div>
                    <img src="Images/products/${displayProduct.imagenes[0]}" 
                        class="product-image" 
                        alt="${displayProduct.cleanName}"
                        onclick="showProductDetail('${encodeURIComponent(displayProduct.nombre)}')">
                </div>
                
                <div class="product-info">
                    <h3 class="product-title" onclick="showProductDetail('${encodeURIComponent(displayProduct.nombre)}')">
                        ${displayProduct.cleanName}
                    </h3>
                    
                    ${variantThumbnails}
                    
                    <div class="price-container">
                        ${isOnSale ? `
                            <span class="original-price">$ ${displayProduct.precio.toFixed(2)}</span>
                            <span class="discount-percent">-${displayProduct.descuento}%</span>
                        ` : ''}
                        <span class="current-price">$ ${finalPrice}</span>
                    </div>
                    
                    <div class="quantity-section">
                        <div class="quantity-controls">
                            <button class="quantity-btn" onclick="adjustQuantity(this, -1, '${cleanName}', event)">
                                <i class="fas fa-minus"></i>
                            </button>
                            <span class="product-quantity" id="quantity-${cleanName}">1</span>
                            <button class="quantity-btn" onclick="adjustQuantity(this, 1, '${cleanName}', event)">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        
                        <button class="add-to-cart" onclick="addToCart('${displayProduct.nombre}', false, event)">
                            <i class="fas fa-cart-plus"></i>
                            <span>Añadir al carrito</span>
                        </button>
                    </div>
                </div>
            `;
            productsGrid.appendChild(productEl);
        });

        // Añadir separador cada 2 categorías
        if (index % 3 === 1 && index !== Object.keys(productsByCategory).length - 1) {
            const separator = document.createElement('div');
            separator.className = 'category-separator';
            separator.innerHTML = '<img src="Images/banners/separator-banner.jpg" alt="Separador de categorías">';
            container.appendChild(separator);
        }
    });
}

// Función para renderizar los productos más vendidos
function renderTopProducts() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        console.error("Elemento #main-content no encontrado para renderTopProducts.");
        return;
    }

    // Eliminar panel existente si lo hay
    const existingPanel = document.getElementById('top-products-section');
    if (existingPanel) existingPanel.remove();

    const topProducts = products.filter(product => product.mas_vendido && !product.isPack);
    if (topProducts.length === 0) return; // No renderizar nada si no hay productos top

    const topProductsSection = document.createElement('div');
    topProductsSection.id = 'top-products-section'; // ID para facilitar su búsqueda posterior
    topProductsSection.className = 'top-products-section';
    topProductsSection.innerHTML = `
        <div class="top-products-header">
            <h2 class="top-products-title">
                <i class="fas fa-crown"></i> Los Más Vendidos
            </h2>
            <a href="#" class="top-products-view-all" onclick="filterProducts('mas_vendido'); return false;">Ver Todos</a>
        </div>
        <div class="top-products-container" id="top-products-container"></div>
    `;

    // Insertar al principio del main-content
    mainContent.insertBefore(topProductsSection, mainContent.firstChild);

    const container = document.getElementById('top-products-container');
    if (!container) {
        console.error("Elemento #top-products-container no encontrado dentro de #top-products-section.");
        return;
    }

    topProducts.forEach(product => {
        // Si el producto es agrupado, mostrar la variante actual o la primera por defecto
        const displayProduct = product.isGrouped ? product.variants[product.currentVariant || 0] : product;
        
        const isOnSale = displayProduct.oferta && displayProduct.descuento > 0;
        const finalPrice = isOnSale 
            ? (displayProduct.precio * (1 - displayProduct.descuento/100)).toFixed(2)
            : displayProduct.precio.toFixed(2);

        const productEl = document.createElement('div');
        productEl.className = 'top-product-card';
        productEl.innerHTML = `
            <div class="top-product-image-container">
                <span class="top-product-badge">TOP</span>
                <img src="Images/products/${displayProduct.imagenes[0]}" 
                    class="top-product-image" 
                    alt="${displayProduct.cleanName || displayProduct.nombre}">
            </div>
            <div class="top-product-info">
                <h3 class="top-product-title">${displayProduct.cleanName || displayProduct.nombre}</h3>
                <div class="top-product-price-container">
                    ${isOnSale ? `
                        <span class="top-product-original-price">$${displayProduct.precio.toFixed(2)}</span>
                    ` : ''}
                    <span class="top-product-price">$${finalPrice}</span>
                    ${isOnSale ? `
                        <span class="top-product-discount">-${displayProduct.descuento}%</span>
                    ` : ''}
                </div>
            </div>
        `;
        productEl.addEventListener('click', () => {
            // Asegurarse de que se pasa el nombre correcto para el detalle (puede ser de la variante)
            showProductDetail(encodeURIComponent(displayProduct.nombre));
        });
        container.appendChild(productEl);
    });
}


function changeProductVariant(thumbElement, baseName, variantIndex, event) {
    if (event) event.stopPropagation();
    
    const productCard = thumbElement.closest('.product-card');
    const product = products.find(p => p.baseName === baseName);
    
    if (!product || !product.isGrouped) return;
    
    // Actualizar la variante actual
    product.currentVariant = variantIndex;
    const variant = product.variants[variantIndex];
    
    // Actualizar toda la información del producto
    const isOnSale = variant.oferta && variant.descuento > 0;
    const finalPrice = isOnSale 
        ? (variant.precio * (1 - variant.descuento/100)).toFixed(2)
        : variant.precio.toFixed(2);

    // Actualizar la imagen principal
    productCard.querySelector('.product-image').src = `Images/products/${variant.imagenes[0]}`;
    productCard.querySelector('.product-image').alt = variant.cleanName;
    productCard.querySelector('.product-image').setAttribute('onclick', `showProductDetail('${encodeURIComponent(variant.nombre)}')`);
    
    // Actualizar el título
    productCard.querySelector('.product-title').textContent = variant.cleanName;
    productCard.querySelector('.product-title').setAttribute('onclick', `showProductDetail('${encodeURIComponent(variant.nombre)}')`);
    
    // Actualizar el precio
    const priceContainer = productCard.querySelector('.price-container');
    priceContainer.innerHTML = `
        ${isOnSale ? `
            <span class="original-price">$ ${variant.precio.toFixed(2)}</span>
            <span class="discount-percent">-${variant.descuento}%</span>
        ` : ''}
        <span class="current-price">$ ${finalPrice}</span>
    `;
    
    // Actualizar el botón de añadir al carrito
    productCard.querySelector('.add-to-cart').setAttribute('onclick', `addToCart('${variant.nombre}', false, event)`);
    
    // Actualizar las miniaturas activas
    const thumbs = productCard.querySelectorAll('.variant-thumb');
    thumbs.forEach((thumb, index) => {
        if (index === variantIndex) {
            thumb.classList.add('active');
        } else {
            thumb.classList.remove('active');
        }
    });
}

// Mostrar detalle del producto con precios corregidos
function showProductDetail(productName) {
    window.scrollTo({top: 0});
    const decodedName = decodeURIComponent(productName);

    document.querySelector('.top-products-section')?.style.setProperty('display', 'none', 'important');
    const packsSection = document.getElementById('packs-section');
    if (packsSection) packsSection.style.display = 'none';
    
    // Buscar el producto principal
    let product = products.find(p => p.nombre === decodedName);
    let isVariant = false;
    let isPack = false;
    let mainProduct = null;
    let variantIndex = 0;
    
    if (!product) {
        mainProduct = products.find(p => 
            p.isGrouped && p.variants.some(v => v.nombre === decodedName)
        );
        
        if (mainProduct) {
            isVariant = true;
            variantIndex = mainProduct.variants.findIndex(v => v.nombre === decodedName);
            product = mainProduct.variants[variantIndex];
        } else {
            window.location.hash = '';
            hideProductDetail();
            return;
        }
    } else if (product.isGrouped) {
        mainProduct = product;
        product = product.variants[0];
        variantIndex = 0;
    } else if (product.isPack) {
        isPack = true;
    }
    
    window.location.hash = encodeURIComponent(product.nombre);
    
    const detailContainer = document.getElementById('product-detail');
    const productsContainer = document.getElementById('products-container');

    if (!detailContainer || !productsContainer) return;

    const isOnSale = product.oferta && product.descuento > 0;
    const finalPrice = isOnSale 
        ? (product.precio * (1 - product.descuento/100)).toFixed(2)
        : product.precio.toFixed(2);
    const priceSave = isOnSale ? (product.precio - finalPrice).toFixed(2) : 0;

    // Obtener productos sugeridos mejorados
    const suggestedProducts = getSuggestedProducts(mainProduct || product, 6); // Mostrar 6 sugerencias
    
    // Contenido específico para packs
    const packContent = isPack ? `
        <div class="detail-pack-contents">
            <h4 class="detail-pack-contents-title">
                <i class="fas fa-box-open"></i> Este pack incluye:
            </h4>
            <ul class="detail-pack-contents-list">
                ${product.productos.map(item => `<li>${item}</li>`).join('')}
            </ul>
            ${product.ahorro ? `
                <div class="pack-price-summary">
                    <span class="pack-original-price">Valor individual: $${(parseFloat(finalPrice) + parseFloat(product.ahorro)).toFixed(2)}</span>
                    <span class="pack-savings-amount">Ahorras: $${product.ahorro.toFixed(2)}</span>
                </div>
            ` : ''}
        </div>
    ` : '';
    
    // Miniaturas de variantes
    const variantThumbnails = mainProduct?.isGrouped ? `
        <div class="variant-thumbnails-detail-container">
            <p class="variant-title">Variantes disponibles:</p>
            <div class="variant-thumbnails-detail">
                ${mainProduct.variants.map((v, index) => `
                    <div class="variant-thumb ${index === variantIndex ? 'active' : ''}" 
                         onclick="changeDetailVariant('${mainProduct.baseName}', ${index}, event)">
                        <img src="Images/products/${v.imagenes[0]}" alt="${v.variantName}">
                        <span class="variant-tooltip">${v.variantName}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    // Badges
    const badges = [];
    if (product.nuevo) badges.push('<span class="detail-badge nuevo"><i class="fas fa-star"></i> Nuevo</span>');
    if (product.oferta) badges.push(`<span class="detail-badge oferta"><i class="fas fa-tag"></i> -${product.descuento}%</span>`);
    if (product.mas_vendido) badges.push('<span class="detail-badge mas-vendido"><i class="fas fa-trophy"></i> Más Vendido</span>');

    // Especificaciones
    const specs = [
        `<li><strong>Categoría</strong> ${product.categoria}</li>`,
        `<li><strong>Disponibilidad</strong> ${product.disponibilidad ? 'En stock' : 'Agotado'}</li>`,
        ...(product.especificaciones || []).map(spec => `<li><strong>${spec.key}</strong> ${spec.value}</li>`)
    ];

    // Sección de productos sugeridos mejorada
    const suggestedProductsHTML = suggestedProducts.length > 0 ? `
        <div class="suggested-products-section">
            <div class="section-header">
                <h3 class="section-title">Productos relacionados</h3>
                <div class="section-divider"></div>
            </div>
            <div class="suggested-products-carousel">
                ${suggestedProducts.map(suggested => {
                    const isOnSaleSuggested = suggested.oferta && suggested.descuento > 0;
                    const finalPriceSuggested = isOnSaleSuggested 
                        ? (suggested.precio * (1 - suggested.descuento/100)).toFixed(2)
                        : suggested.precio.toFixed(2);
                    
                    return `
                        <div class="suggested-item">
                            <div class="suggested-badges">
                                ${suggested.nuevo ? '<span class="badge nuevo">NUEVO</span>' : ''}
                                ${suggested.oferta ? '<span class="badge oferta">OFERTA</span>' : ''}
                                ${suggested.mas_vendido ? '<span class="badge mas-vendido">TOP</span>' : ''}
                            </div>
                            <div class="suggested-image" onclick="showProductDetail('${encodeURIComponent(suggested.nombre)}')">
                                <img src="Images/products/${suggested.imagenes[0]}" alt="${suggested.cleanName || suggested.nombre}">
                            </div>
                            <div class="suggested-details">
                                <h4 class="suggested-name" onclick="showProductDetail('${encodeURIComponent(suggested.nombre)}')">
                                    ${suggested.cleanName || suggested.nombre}
                                </h4>
                                <div class="suggested-price">
                                    ${isOnSaleSuggested ? `
                                        <span class="original-price">$ ${suggested.precio.toFixed(2)}</span>
                                        <span class="current-price">$ ${finalPriceSuggested}</span>
                                    ` : `
                                        <span class="current-price">$ ${finalPriceSuggested}</span>
                                    `}
                                </div>
                                <button class="add-to-cart-mini" onclick="addToCart('${suggested.nombre}', false, event)">
                                    <i class="fas fa-cart-plus"></i> Añadir
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    ` : '';

    detailContainer.innerHTML = `
        <div class="detail-container">
            <div class="detail-gallery">
                <div class="main-image-container">
                    <img src="Images/products/${product.imagenes[0]}" class="main-image" alt="${product.cleanName || product.nombre}" id="main-product-image">
                </div>
            </div>
            
            <div class="detail-info">
                <h1 class="detail-title">${product.cleanName || product.nombre}</h1>
                
                ${isPack ? '<div class="detail-badge-pack nuevo"><i class="fas fa-box-open"></i> PACK</div>' : ''}
                ${badges.length ? `<div class="detail-badges">${badges.join('')}</div>` : ''}
                
                <div class="price-section">
                    ${isOnSale ? `
                        <div class="price-with-discount">
                            <span class="price-original">$ ${product.precio.toFixed(2)}</span>
                            <span class="discount-percent">-${product.descuento}%</span>
                        </div>
                        <span class="price-current">$ ${finalPrice}</span>
                        <div class="price-save">Ahorras $ ${priceSave}</div>
                    ` : `
                        <span class="price-current">$ ${finalPrice}</span>
                    `}
                </div>
                
                ${packContent}
                
                <div class="quantity-section">
                    <label class="quantity-label">Cantidad:</label>
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="adjustDetailQuantity(-1, event)">-</button>
                        <span class="quantity-display" id="detail-quantity">1</span>
                        <button class="quantity-btn" onclick="adjustDetailQuantity(1, event)">+</button>
                    </div>
                </div>

                <button class="add-to-cart-btn" onclick="addToCart('${product.nombre}', true, event)">
                    <i class="fas fa-cart-plus"></i>
                    Añadir al carrito
                </button>
                
                ${product.descripcion ? `
                    <div class="product-description">
                        <h4 class="description-title"><i class="fas fa-align-left"></i> Descripción</h4>
                        <div class="description-content">
                            ${formatProductDescription(product.descripcion)}
                        </div>
                    </div>
                ` : ''}
                
                <div class="product-specs">
                    <h3 class="specs-title"><i class="fas fa-list-ul"></i> Especificaciones</h3>
                    <ul class="specs-list">
                        <li><strong>Categoría</strong> ${product.categoria}</li>
                        <li><strong>Disponibilidad</strong> ${product.disponibilidad ? 'En stock' : 'Agotado'}</li>
                    </ul>
                </div>
            </div>
            
            <div class="back-btn-container">
                <button class="back-btn" onclick="hideProductDetail()">
                    <i class="fas fa-arrow-left"></i> Volver a productos
                </button>
            </div>
            
            ${suggestedProductsHTML}
        </div>
    `;

    productsContainer.style.display = 'none';
    detailContainer.style.display = 'block';
    currentProduct = product;


    toggleCarousel(false);
}

function changeDetailVariant(baseName, variantIndex, event) {
    if (event) event.stopPropagation();
    
    const product = products.find(p => p.baseName === baseName);
    
    if (product && product.isGrouped && product.variants[variantIndex]) {
        const variant = product.variants[variantIndex];
        window.location.hash = encodeURIComponent(variant.nombre);
        showProductDetail(variant.nombre);
    }
}

function getSuggestedProducts(currentProduct, count = 6) {
    if (!currentProduct || !products.length) return [];
    
    const baseProduct = currentProduct.isGrouped ? currentProduct : currentProduct;
    const currentCategory = baseProduct.categoria;
    
    // Excluir el producto actual y sus variantes
    const excludedIds = baseProduct.isGrouped 
        ? [...baseProduct.variants.map(v => v.id), baseProduct.id]
        : [baseProduct.id];
    
    // Primero: productos de la misma categoría
    const sameCategory = products.filter(p => 
        p.categoria === currentCategory && 
        !excludedIds.includes(p.id) &&
        p.id !== baseProduct.id
    );
    
    // Segundo: productos destacados de otras categorías
    const featuredProducts = products.filter(p => 
        p.categoria !== currentCategory && 
        !excludedIds.includes(p.id) &&
        (p.mas_vendido || p.nuevo || p.oferta)
    );
    
    // Combinar y ordenar
    const suggested = [
        ...sameCategory.map(p => ({ product: p, score: 3 })),
        ...featuredProducts.map(p => ({ product: p, score: 1 }))
    ];
    
    // Aleatorizar y limitar
    return suggested
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (b.product.mas_vendido !== a.product.mas_vendido) return b.product.mas_vendido ? 1 : -1;
            if (b.product.oferta !== a.product.oferta) return b.product.oferta ? 1 : -1;
            return Math.random() - 0.5;
        })
        .slice(0, count)
        .map(item => item.product);
}

// Carrusel de productos sugeridos
function initSuggestedProductsCarousel() {
    const carousel = document.querySelector('.suggested-products-carousel');
    if (!carousel) return;

    const prevBtn = document.createElement('button');
    prevBtn.className = 'carousel-nav prev hidden';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.onclick = () => scrollCarousel(-1);
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'carousel-nav next';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.onclick = () => scrollCarousel(1);

    carousel.parentElement.insertBefore(prevBtn, carousel);
    carousel.parentElement.insertBefore(nextBtn, carousel.nextSibling);

    // Actualizar visibilidad de botones
    function updateNavButtons() {
        const { scrollLeft, scrollWidth, clientWidth } = carousel;
        prevBtn.classList.toggle('hidden', scrollLeft === 0);
        nextBtn.classList.toggle('hidden', scrollLeft >= scrollWidth - clientWidth - 1);
    }

    // Función para desplazar el carrusel
    function scrollCarousel(direction) {
        const itemWidth = carousel.querySelector('.suggested-item').offsetWidth;
        const scrollAmount = (itemWidth + 20) * direction; // 20px es el gap
        
        carousel.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
        });
    }

    // Event listeners
    carousel.addEventListener('scroll', updateNavButtons);
    updateNavButtons();

    // Touch events para móviles
    let isDragging = false;
    let startX;
    let scrollLeft;

    carousel.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.pageX - carousel.offsetLeft;
        scrollLeft = carousel.scrollLeft;
        carousel.style.cursor = 'grabbing';
        carousel.style.scrollBehavior = 'auto';
    });

    carousel.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - carousel.offsetLeft;
        const walk = (x - startX) * 2;
        carousel.scrollLeft = scrollLeft - walk;
    });

    carousel.addEventListener('mouseup', () => {
        isDragging = false;
        carousel.style.cursor = 'grab';
        carousel.style.scrollBehavior = 'smooth';
        updateNavButtons();
    });

    carousel.addEventListener('mouseleave', () => {
        isDragging = false;
        carousel.style.cursor = 'grab';
    });

    // Touch events
    carousel.addEventListener('touchstart', (e) => {
        isDragging = true;
        startX = e.touches[0].pageX - carousel.offsetLeft;
        scrollLeft = carousel.scrollLeft;
        carousel.style.scrollBehavior = 'auto';
    });

    carousel.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const x = e.touches[0].pageX - carousel.offsetLeft;
        const walk = (x - startX) * 2;
        carousel.scrollLeft = scrollLeft - walk;
    });

    carousel.addEventListener('touchend', () => {
        isDragging = false;
        carousel.style.scrollBehavior = 'smooth';
        updateNavButtons();
    });

    // Actualizar al redimensionar
    window.addEventListener('resize', updateNavButtons);
}

// Función auxiliar para formatear la descripción
function formatProductDescription(description) {
    if (!description) return '<p class="no-description">No hay descripción disponible</p>';
    
    // Dividir en oraciones considerando múltiples signos de puntuación
    const sentences = description.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    
    return sentences.map(sentence => {
        const trimmedSentence = sentence.trim();
        // Destacar oraciones importantes
        const isImportant = /(garantiza|ideal|perfecto|exclusiv|especial)/i.test(trimmedSentence);
        
        return `
            <div class="description-sentence ${isImportant ? 'important-sentence' : ''}">
                <div class="sentence-icon">
                    <i class="fas ${isImportant ? 'fa-star' : 'fa-angle-right'}"></i>
                </div>
                <div class="sentence-text">
                    ${trimmedSentence}
                    ${!trimmedSentence.endsWith('.') && !trimmedSentence.endsWith('!') && !trimmedSentence.endsWith('?') ? '.' : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Función auxiliar para cambiar imagen principal
function changeMainImage(imgSrc) {
    const mainImg = document.getElementById('main-product-image');
    if (mainImg) {
        mainImg.src = `Images/products/${imgSrc}`;
        mainImg.style.opacity = '0';
        setTimeout(() => {
            mainImg.style.opacity = '1';
            mainImg.style.transition = 'opacity 0.3s ease';
        }, 10);
    }
}

// Ocultar detalle
// Función para ocultar el detalle del producto
function hideProductDetail() {
    const productsContainer = document.getElementById('products-container');
    const detailContainer = document.getElementById('product-detail');
    
    if (productsContainer) {
        productsContainer.style.display = 'grid';
        productsContainer.style.animation = 'fadeIn 0.4s ease-out';
    }
    
    if (detailContainer) {
        detailContainer.style.display = 'none';
        detailContainer.innerHTML = '';
    }
    
    // Mostrar productos más vendidos
    document.querySelector('.top-products-section')?.style.removeProperty('display');

    // Mostrar el panel de packs nuevamente si corresponde
    const currentCategory = document.querySelector('#categories-list li[style="color: var(--dorado);"]')?.textContent;

    const packsSection = document.getElementById('packs-section');
    if (packsSection || packsSection && (currentCategory === 'Todo' || currentCategory === 'Combos')) {
        packsSection.style.display = 'block';
    }
    
    
    currentProduct = null;
    window.location.hash = '';
    toggleCarousel(true);
}

// Carrito
function addToCart(productName, fromDetail = false, event) {
    if (event) event.stopPropagation();
    
    const decodedName = decodeURIComponent(productName);
    
    // Buscar el producto principal o pack
    let product = products.find(p => p.nombre === decodedName) || 
                 products.flatMap(p => p.isGrouped ? p.variants : []).find(v => v.nombre === decodedName);
    
    if (!product) {
        console.error('Producto no encontrado:', decodedName);
        return;
    }

    let quantity;
    if (fromDetail) {
        const quantityElement = document.getElementById('detail-quantity');
        quantity = quantityElement ? parseInt(quantityElement.textContent) || 1 : 1;
    } else {
        // Manejar tanto productos normales como packs
        let quantityElement;
        const productCard = event.target.closest('.product-card');
        const packCard = event.target.closest('.pack-card');
        
        if (productCard) {
            quantityElement = productCard.querySelector('.product-quantity');
        } else if (packCard) {
            quantityElement = document.getElementById(`pack-quantity-${product.nombre.replace(/'/g, "\\'")}`);
        }
        
        quantity = quantityElement ? parseInt(quantityElement.textContent) || 1 : 1;
    }

    const existingItem = cart.find(item => item.product.nombre === decodedName);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ product: product, quantity: quantity });
    }

    updateCart();
    saveCart();
    showCartNotification(product.cleanName || product.nombre, quantity);
}

function updateCart() {
    const cartItems = document.getElementById('cart-items');
    const totalElement = document.getElementById('total');
    const emptyPanel = document.getElementById('empty-cart-panel');
    const cartSidebar = document.getElementById('cart');
    
    if (!cartItems || !totalElement || !emptyPanel || !cartSidebar) return;
    
    cartItems.innerHTML = '';
    let total = 0;
    
    if (cart.length === 0) {
        cartSidebar.classList.add('empty');
    } else {
        cartSidebar.classList.remove('empty');
        
        cart.forEach((item, index) => {
            // Calcular precio con descuento si aplica
            const isOnSale = item.product.oferta && item.product.descuento > 0;
            const unitPrice = isOnSale 
                ? item.product.precio * (1 - item.product.descuento/100)
                : item.product.precio;
            
            const itemTotal = unitPrice * item.quantity;
            total += itemTotal;
            
            const itemEl = document.createElement('div');
            itemEl.className = 'cart-item';
            itemEl.innerHTML = `
                ${isOnSale ? '<span class="cart-item-badge oferta">OFERTA</span>' : ''}
                <img src="Images/products/${item.product.imagenes[0]}" alt="${item.product.nombre}">
                <div class="cart-item-info">
                    <p>${item.product.nombre}</p>
                    <p>$${unitPrice.toFixed(2)} c/u</p>
                    <div class="cart-item-controls">
                        <button class="cart-quantity-btn decrease-btn" onclick="updateCartQuantity(${index}, -1, event)">-</button>
                        <span class="cart-quantity">${item.quantity}</span>
                        <button class="cart-quantity-btn increase-btn" onclick="updateCartQuantity(${index}, 1, event)">+</button>
                        <button class="delete-item-btn" onclick="removeFromCart(${index}, event)">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                    <p>Total: $${itemTotal.toFixed(2)}</p>
                </div>
            `;
            cartItems.appendChild(itemEl);
        });
        
        totalElement.textContent = total.toFixed(2);
    }
    
    updateCartCount();
}

function removeFromCart(index, event) {
    if (event) event.stopPropagation();
    
    if (cart[index]) {
        const productName = cart[index].product.nombre;
        cart.splice(index, 1);
        updateCart();
        saveCart();
        
        // Mostrar notificación de eliminación
        showRemoveNotification(productName);
    }
}

function showRemoveNotification(productName) {
    const notification = document.createElement('div');
    notification.className = 'cart-notification removed';
    notification.innerHTML = `
        <p>${productName} eliminado del carrito</p>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function updateCartQuantity(index, change, event) {
    if (event) event.stopPropagation();
    
    if (cart[index]) {
        cart[index].quantity += change;
        if (cart[index].quantity < 1) cart.splice(index, 1);
        updateCart();
        saveCart();
    }
}

function showCartNotification(productName, quantity) {
    const notification = document.createElement('div');
    notification.className = 'cart-notification';
    notification.innerHTML = `
        <p>${quantity}x ${productName} añadido al carrito</p>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Vaciar completamente el carrito
function clearCart() {
    cart = [];
    localStorage.removeItem('cart');
    updateCart();
    updateCartCount();
}

// Funciones auxiliares
function adjustQuantity(btn, change, productName, event) {
    if (event) event.stopPropagation();
    const quantityElement = document.getElementById(`quantity-${productName}`);
    if (quantityElement) {
        let quantity = parseInt(quantityElement.textContent) || 1;
        quantity = Math.max(1, quantity + change);
        quantityElement.textContent = quantity;
    }
}

function adjustDetailQuantity(change, event) {
    if (event) event.stopPropagation();
    const quantityElement = document.getElementById('detail-quantity');
    if (quantityElement) {
        let quantity = parseInt(quantityElement.textContent) || 1;
        quantity = Math.max(1, quantity + change);
        quantityElement.textContent = quantity;
    }
}

function toggleCart() {
    const cart = document.getElementById('cart');
    const cartOverlay = document.getElementById('cart-overlay');
    
    if (!cart) return;

    const isOpening = !cart.classList.contains('active');
    
    // Cerrar sidebar si está abierto
    closeSidebar();
    
    // Alternar estado del carrito
    cart.classList.toggle('active');
    document.body.classList.toggle('cart-open', isOpening);

    // Mostrar el header si se abre el carrito
    if (isOpening) {
        header.classList.remove('hidden');
    }

    // Manejar el overlay
    if (isOpening) {
        if (!cartOverlay) {
            const overlay = document.createElement('div');
            overlay.id = 'cart-overlay';
            overlay.className = 'cart-overlay';
            overlay.onclick = closeCart;
            document.body.appendChild(overlay);
            setTimeout(() => overlay.classList.add('active'), 10);
        } else {
            cartOverlay.classList.add('active');
        }
    } else {
        closeCart();
    }
}

function closeCart() {
    const cart = document.getElementById('cart');
    const cartOverlay = document.getElementById('cart-overlay');
    
    if (cart && cart.classList.contains('active')) {
        cart.classList.remove('active');
        document.body.classList.remove('cart-open');
    }
    
    if (cartOverlay) {
        cartOverlay.classList.remove('active');
        setTimeout(() => {
            if (cartOverlay && !cartOverlay.classList.contains('active')) {
                cartOverlay.remove();
            }
        }, 300);
    }
}

function updateCartCount() {
    const countElement = document.getElementById('cart-count');
    if (countElement) {
        const count = cart.reduce((acc, item) => acc + item.quantity, 0);
        countElement.textContent = count;
    }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Cerrar carrito al hacer clic fuera
document.addEventListener('click', (e) => {
    const cart = document.getElementById('cart');
    const cartBtn = document.querySelector('.cart-btn');
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    
    // Manejar cierre del carrito
    if (cart && cartBtn && cart.classList.contains('active') && 
        !cart.contains(e.target) && e.target !== cartBtn && !cartBtn.contains(e.target)) {
        closeCart();
    }
    
    // Manejar cierre del sidebar
    if (sidebar && menuToggle && sidebar.classList.contains('active') && 
        !sidebar.contains(e.target) && e.target !== menuToggle && !menuToggle.contains(e.target)) {
        closeSidebar();
    }
});

/**
 * Abre WhatsApp con mensaje predeterminado
 */
function openWhatsApp() {
    const phoneNumber = '+5353411131';
    const message = encodeURIComponent('Estoy interesado en los productos que vi en su tienda. ¿Podrían ayudarme?');
    const url = `https://wa.me/${phoneNumber}?text=${message}`;
    
    // Abrir en una nueva pestaña
    window.open(url, '_blank');
}

// Variables globales del carrusel
// Variables globales del carrusel
let slideIndex = 0;
let slideInterval;
const slides = document.querySelectorAll('.carousel-slide');
const dots = document.querySelectorAll('.dot');
const track = document.querySelector('.carousel-track');
const carousel = document.getElementById('main-carousel');
const totalSlides = slides.length;
let touchStartX = 0;
let touchEndX = 0;

// Inicialización del carrusel
function initCarousel() {
    if (!carousel) return;
    
    updateCarousel();
    startAutoSlide();
    setupEventListeners();
    checkCarouselVisibility();
}

// Configura los event listeners
function setupEventListeners() {
    // Controles de navegación
    document.querySelector('.carousel-control.prev').addEventListener('click', () => moveSlide(1));
    document.querySelector('.carousel-control.next').addEventListener('click', () => moveSlide(-1));
    
    // Pausar al interactuar
    carousel.addEventListener('mouseenter', pauseAutoSlide);
    carousel.addEventListener('mouseleave', startAutoSlide);
    
    // Touch events para móviles
    track.addEventListener('touchstart', handleTouchStart, {passive: true});
    track.addEventListener('touchend', handleTouchEnd, {passive: true});
    
    // Botones de acción
    document.querySelectorAll('.carousel-btn').forEach(button => {
        button.addEventListener('click', handleCarouselButtonClick);
    });
}

function handleTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX;
    pauseAutoSlide();
}

function handleTouchEnd(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
    startAutoSlide();
}

function handleSwipe() {
    const threshold = 50;
    if (touchEndX < touchStartX - threshold) {
        moveSlide(1); // Swipe izquierda
    } else if (touchEndX > touchStartX + threshold) {
        moveSlide(-1); // Swipe derecha
    }
}

function handleCarouselButtonClick(e) {
    const button = e.currentTarget;
    const filterType = button.getAttribute('data-filter');
    filterProducts(filterType);
}

function filterProducts(filterType) {
    // Ocultar detalle de producto si está visible
    hideProductDetail();
    
    // Limpiar búsqueda si hay algo
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    
    // Filtrar productos según el tipo
    let filteredProducts = products.filter(product => {
        switch(filterType) {
            case 'oferta': return product.oferta && product.descuento > 0;
            case 'nuevo': return product.nuevo;
            case 'mas_vendido': return product.mas_vendido;
            default: return true;
        }
    });
    
    // Renderizar productos filtrados
    renderProducts(filteredProducts);
    
    // Desplazarse a la sección de productos
    setTimeout(() => {
        document.getElementById('products-container').scrollIntoView({behavior: 'smooth'});
    }, 100);
}

// Manejo del carrusel
function updateCarousel() {
    track.style.transform = `translateX(-${slideIndex * 100}%)`;
    
    // Actualizar dots
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === slideIndex);
    });
    
    // Actualizar slides
    slides.forEach((slide, index) => {
        slide.classList.toggle('active', index === slideIndex);
    });
}

function moveSlide(n) {
    slideIndex = (slideIndex + n + totalSlides) % totalSlides;
    updateCarousel();
    resetAutoSlide();
}

function currentSlide(n) {
    slideIndex = n - 1;
    updateCarousel();
    resetAutoSlide();
}

// Auto-desplazamiento
function startAutoSlide() {
    pauseAutoSlide();
    slideInterval = setInterval(() => moveSlide(1), 5000);
}

function pauseAutoSlide() {
    clearInterval(slideInterval);
}

function resetAutoSlide() {
    pauseAutoSlide();
    startAutoSlide();
}

// Control de visibilidad
function checkCarouselVisibility() {
    const productDetail = document.getElementById('product-detail');
    if (productDetail && productDetail.style.display === 'block') {
        carousel.style.display = 'none';
    } else {
        carousel.style.display = 'block';
    }
}

function toggleCarousel(show) {
    if (show) {
        carousel.style.display = 'block';
        resetAutoSlide();
    } else {
        carousel.style.display = 'none';
        pauseAutoSlide();
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', initCarousel);
window.addEventListener('hashchange', checkCarouselVisibility);

// Inicialización
document.addEventListener('DOMContentLoaded', loadProducts);