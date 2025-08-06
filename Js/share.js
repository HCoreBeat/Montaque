async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('¡Enlace copiado!');
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('¡Enlace copiado!');
        } catch (err) {
            showToast('Error al copiar el enlace');
        }
        document.body.removeChild(textArea);
    }
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.innerHTML = `
        <i class="fas fa-check-circle"></i>
        ${message}
    `;
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after animation
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 2000);
}

async function shareOnSocialMedia(type, data) {
    const shareUrls = {
        facebook: `https://www.facebook.com/share.php?u=${encodeURIComponent(data.url)}`,
        twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(data.url)}&text=${encodeURIComponent(data.text)}`,
        whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(data.text + ' ' + data.url)}`,
        telegram: `https://t.me/share/url?url=${encodeURIComponent(data.url)}&text=${encodeURIComponent(data.text)}`
    };

    const width = 600;
    const height = 400;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;

    window.open(
        shareUrls[type],
        'share',
        `width=${width},height=${height},left=${left},top=${top}`
    );
}

async function generateProductImage(product) {
    // Configuración inicial del contenedor
    const container = document.createElement('div');
    Object.assign(container.style, {
        width: '320px',
        backgroundColor: '#FFFFFF',
        position: 'fixed',
        left: '-9999px',
        top: '0',
        fontFamily: "'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
        borderRadius: '12px',
        overflow: 'hidden'
    });

    // Preparar datos del producto
    const actualImage = document.querySelector('.main-image');
    const imageUrl = actualImage ? actualImage.src : product.imagen;
    const productLink = `https://www.montaqueshops.com/#${encodeURIComponent(product.nombre)}`;
    const finalPrice = product.descuento 
        ? product.precio * (1 - product.descuento/100)
        : product.precio;

    // Función auxiliar para formatear precios
    const formatPrice = price => '$' + price.toFixed(2);

    // Generar badges del producto
    const generateBadges = () => {
        const badges = [];
        if (product.top) badges.push({
            bg: '#2A9D8F', 
            icon: 'trophy', 
            text: 'TOP VENTAS'
        });
        if (product.nuevo) badges.push({
            bg: '#0066C0', 
            icon: 'star', 
            text: 'NUEVO'
        });
        if (product.oferta) badges.push({
            bg: '#da3030', 
            icon: 'tag', 
            text: 'OFERTA'
        });
        return badges;
    };

    // Pack details section si es un pack
    const packDetails = product.isPack && product.productos ? `
        <div style="background: linear-gradient(135deg, #F8F8F8 0%, #FFFFFF 100%);
                    border-radius: 12px; padding: 15px; margin: 15px -15px 5px;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
            <!-- Pack Header with Premium Gradient -->
            <div style="display: flex; justify-content: space-between; align-items: center;
                        background: linear-gradient(135deg, #121212 0%, #2D2D2D 100%);
                        padding: 12px 15px; margin: -15px -15px 15px -15px;
                        border-radius: 12px 12px 0 0;
                        position: relative; overflow: hidden;">
                <!-- Header Shine Effect -->
                <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                            background: linear-gradient(135deg, 
                                rgba(255,255,255,0) 0%,
                                rgba(255,255,255,0.1) 50%,
                                rgba(255,255,255,0) 100%);
                            transform: skewX(-20deg) translateX(-100%);
                            animation: headerShine 4s infinite;">
                </div>
                <style>
                    @keyframes headerShine {
                        0% { transform: skewX(-20deg) translateX(-100%); }
                        40% { transform: skewX(-20deg) translateX(200%); }
                        100% { transform: skewX(-20deg) translateX(200%); }
                    }
                </style>
                
                <div style="display: flex; align-items: center; gap: 10px; z-index: 1;">
                    <div style="background: linear-gradient(135deg, #C8A131 0%, #E5B94C 100%);
                               width: 28px; height: 28px;
                               display: flex; align-items: center; justify-content: center;
                               border-radius: 8px;
                               box-shadow: 0 2px 8px rgba(200,161,49,0.3);">
                        <i class="fas fa-box-open" style="color: white; font-size: 14px;
                                                       filter: drop-shadow(0 2px 3px rgba(0,0,0,0.2));"></i>
                    </div>
                    <div style="display: flex; flex-direction: column;">
                        <span style="color: #C8A131; font-size: 11px; font-weight: 500;
                                   text-transform: uppercase; letter-spacing: 0.5px;">
                            Pack Especial
                        </span>
                        <span style="color: white; font-size: 14px; font-weight: 600;
                                   text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                            ${product.productos.length} Productos Incluidos
                        </span>
                    </div>
                </div>
                ${product.ahorro ? `
                    <div style="background: linear-gradient(135deg, #2A9D8F 0%, #3CB4A4 100%);
                                padding: 8px 14px; border-radius: 8px; z-index: 1;
                                box-shadow: 0 4px 12px rgba(42,157,143,0.3);">
                        <div style="font-size: 11px; color: rgba(255,255,255,0.9);
                                   text-transform: uppercase; letter-spacing: 0.5px;">
                            Ahorro Total
                        </div>
                        <div style="color: white; font-size: 14px; font-weight: 700;
                                   text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                            ${formatPrice(product.ahorro)}
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <!-- Products Grid with Auto Height -->
            <div style="display: flex; flex-direction: column; gap: 8px; padding: 0 5px;">
                ${product.productos.map((item, index) => `
                    <div style="background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,1) 100%);
                                padding: 10px 12px; border-radius: 10px; 
                                display: flex; align-items: center; gap: 10px;
                                box-shadow: 0 4px 12px rgba(0,0,0,0.04);
                                border: 1px solid rgba(200,161,49,0.1);
                                position: relative; overflow: hidden;">
                        <!-- Item Shine -->
                        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                                    background: linear-gradient(135deg,
                                        rgba(255,255,255,0) 0%,
                                        rgba(255,255,255,0.4) 50%,
                                        rgba(255,255,255,0) 100%);
                                    transform: skewX(-20deg) translateX(-100%);
                                    animation: itemShine${index} 3s infinite ${index * 0.2}s;">
                        </div>
                        <style>
                            @keyframes itemShine${index} {
                                0% { transform: skewX(-20deg) translateX(-100%); }
                                40% { transform: skewX(-20deg) translateX(200%); }
                                100% { transform: skewX(-20deg) translateX(200%); }
                            }
                        </style>
                        
                        <div style="background: linear-gradient(135deg, 
                                    ${index % 2 ? '#2A9D8F' : '#C8A131'} 0%, 
                                    ${index % 2 ? '#3CB4A4' : '#E5B94C'} 100%);
                                    min-width: 24px; height: 24px; border-radius: 6px;
                                    display: flex; align-items: center; justify-content: center;
                                    box-shadow: 0 2px 6px ${index % 2 ? 
                                        'rgba(42,157,143,0.2)' : 
                                        'rgba(200,161,49,0.2)'};">
                            <i class="fas fa-check" style="color: white; font-size: 12px;
                                                         text-shadow: 0 1px 2px rgba(0,0,0,0.1);"></i>
                        </div>
                        <span style="color: #2D2D2D; font-size: 13px; font-weight: 500;
                                   flex: 1; line-height: 1.3;">
                            ${item}
                        </span>
                    </div>
                `).join('')}
            </div>
            
            ${product.ahorro ? `
                <div style="margin-top: 15px; padding-top: 12px;
                            border-top: 1px solid rgba(200,161,49,0.15);
                            display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; flex-direction: column; gap: 2px;">
                        <span style="font-size: 11px; color: #666;">
                            Precio Individual
                        </span>
                        <span style="font-size: 14px; color: #5E5E5E;
                                   text-decoration: line-through;">
                            ${formatPrice(product.precio + product.ahorro)}
                        </span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 2px; align-items: flex-end;">
                        <span style="font-size: 11px; color: #2A9D8F; font-weight: 600;">
                            Precio Pack
                        </span>
                        <span style="font-size: 16px; font-weight: 700;
                                   background: linear-gradient(135deg, #C8A131 0%, #E5B94C 100%);
                                   -webkit-background-clip: text;
                                   -webkit-text-fill-color: transparent;
                                   text-shadow: 0 2px 4px rgba(200,161,49,0.1);">
                            ${formatPrice(product.precio)}
                        </span>
                    </div>
                </div>
            ` : ''}
        </div>
    ` : '';

    // Create the content for the image
    container.innerHTML = `
        <div style="background: white; overflow: hidden;">
            <!-- Header -->
            <div style="padding: 12px; background: #121212; 
                        display: flex; justify-content: space-between; align-items: center;">
                <img src="Images/logo.png" alt="Montaque Logo" style="height: 28px;">
                <div style="background: #C8A131; padding: 4px 10px; border-radius: 4px;
                            color: white; font-size: 11px; font-weight: 600;">
                    ${product.isPack ? 'Pack Especial' : 'Producto'}
                </div>
            </div>

            <!-- Main Content -->
            <div style="padding: 15px;">
                <!-- Title and Price Section -->
                <div style="margin-bottom: 10px;">
                    <h2 style="margin: 0 0 6px 0; color: #121212; font-size: 16px; 
                              line-height: 1.3; font-weight: 600;">
                        ${product.nombre}
                    </h2>
                    <!-- Price Display -->
                    <div style="display: flex; justify-content: flex-end; align-items: baseline; gap: 8px;">
                        ${product.descuento ? `
                            <span style="color: #5E5E5E; font-size: 12px; text-decoration: line-through;">
                                ${formatPrice(product.precio)}
                            </span>
                            <span style="color: #C8A131; font-size: 18px; font-weight: 700;">
                                ${formatPrice(finalPrice)}
                            </span>
                        ` : `
                            <span style="color: #C8A131; font-size: 18px; font-weight: 700;">
                                ${formatPrice(product.precio)}
                            </span>
                        `}
                    </div>
                </div>

                <!-- Product Image Area -->
                <div style="position: relative; margin: 10px -15px;
                            background: linear-gradient(135deg, #F8F8F8 0%, #FFFFFF 100%);">
                    <!-- Shine Effect -->
                    <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                                background: linear-gradient(135deg, 
                                    rgba(255,255,255,0) 0%,
                                    rgba(255,255,255,0.4) 50%,
                                    rgba(255,255,255,0) 100%);
                                transform: skewX(-20deg) translateX(-100%);
                                animation: shine 3s infinite;">
                    </div>

                    <style>
                        @keyframes shine {
                            0% { transform: skewX(-20deg) translateX(-100%); }
                            50% { transform: skewX(-20deg) translateX(100%); }
                            100% { transform: skewX(-20deg) translateX(100%); }
                        }
                    </style>

                    <!-- Overlays Container -->
                    <div style="position: absolute; top: 12px; left: 12px; right: 12px;
                                display: flex; justify-content: space-between; z-index: 2;">
                        <!-- Left Badges -->
                        <div style="display: flex; flex-direction: column; gap: 6px;">
                            ${generateBadges().map(badge => `
                                <div style="background: linear-gradient(135deg, ${badge.bg} 0%, ${badge.bg}DD 100%);
                                            color: white; padding: 6px 12px; border-radius: 8px;
                                            font-size: 11px; font-weight: 600;
                                            display: flex; align-items: center; gap: 6px;
                                            box-shadow: 0 4px 12px ${badge.bg}40;">
                                    <i class="fas fa-${badge.icon}"></i>
                                    ${badge.text}
                                </div>
                            `).join('')}
                        </div>
                        
                        <!-- Discount Badge -->
                        ${product.descuento ? `
                            <div style="background: linear-gradient(135deg, #da3030 0%, #e74c3c 100%);
                                        color: white; padding: 6px 14px; border-radius: 8px;
                                        font-size: 12px; font-weight: 700;
                                        box-shadow: 0 4px 12px rgba(218,48,48,0.3);">
                                -${product.descuento}%
                            </div>
                        ` : ''}
                    </div>

                    <!-- Image Container with Glow -->
                    <div style="height: 240px; display: flex; align-items: center; 
                                justify-content: center; padding: 20px;
                                background: radial-gradient(circle at center,
                                    rgba(200,161,49,0.05) 0%,
                                    rgba(200,161,49,0) 70%);">
                        <img src="${imageUrl}" alt="${product.nombre}" 
                            style="max-width: 90%; max-height: 90%; object-fit: contain;
                                   filter: drop-shadow(0 8px 16px rgba(0,0,0,0.1));
                                   border-radius: 8px;">
                    </div>
                </div>

                <!-- Pack/Description Section -->
                ${packDetails || (product.descripcion ? `
                    <div style="background: linear-gradient(135deg, #F8F8F8 0%, #FFFFFF 100%);
                                border-radius: 12px; margin: 15px -15px 5px;
                                padding: 15px; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
                        <div style="font-size: 14px; color: #444; margin-bottom: 12px;
                                  font-weight: 600; display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-info-circle" style="color: #c8a131"></i>
                            Descripción
                        </div>
                        <p style="margin: 0; color: #2D2D2D; font-size: 12px;
                                 line-height: 1.5; display: -webkit-box;
                                 -webkit-line-clamp: 4; -webkit-box-orient: vertical;
                                 overflow: hidden; text-overflow: ellipsis;
                                 background: rgba(255,255,255,0.8);
                                 padding: 10px; border-radius: 8px;
                                 box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                            ${product.descripcion}
                        </p>
                    </div>
                ` : '')}

                <!-- Footer -->
                <div style="margin-top: 12px;">
                    <!-- Contact Info -->
                    <div style="display: flex; align-items: center; justify-content: center; 
                                gap: 8px; margin-bottom: 8px;
                                border-bottom: 1px solid rgba(200,161,49,0.1);
                                padding-bottom: 8px;">
                        <img src="Images/logo.png" alt="Montaque Logo" 
                             style="height: 18px; opacity: 0.8;">
                        <div style="color: #5E5E5E; font-size: 10px;">
                            <i class="fas fa-phone"></i> +1 2297163120
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(container);

    try {
        // Asegurar que las imágenes se carguen correctamente
        await new Promise(resolve => {
            const images = container.getElementsByTagName('img');
            let loadedImages = 0;
            const totalImages = images.length;

            if (totalImages === 0) resolve();

            Array.from(images).forEach(img => {
                if (img.complete) {
                    loadedImages++;
                    if (loadedImages === totalImages) resolve();
                } else {
                    img.onload = () => {
                        loadedImages++;
                        if (loadedImages === totalImages) resolve();
                    };
                    img.onerror = () => {
                        loadedImages++;
                        if (loadedImages === totalImages) resolve();
                    };
                }
            });
        });

        // Generar la imagen con mejor calidad
        const canvas = await html2canvas(container, {
            scale: 3, // Mayor calidad
            logging: false,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#FFFFFF'
        });

        // Optimizar y descargar la imagen
        const image = canvas.toDataURL('image/png', 0.95);
        const filename = `montaque-${product.nombre.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-+|-+$)/g, '')}.png`;
            
        const link = document.createElement('a');
        link.download = filename;
        link.href = image;
        link.click();

    } catch (error) {
        console.error('Error generating image:', error);
        alert('Hubo un error al generar la imagen. Por favor, inténtalo de nuevo.');
    } finally {
        // Clean up
        document.body.removeChild(container);
    }
}

function addShareButton() {
    const productDetail = document.getElementById('product-detail');
    const shareButton = document.createElement('button');
    shareButton.className = 'share-button';
    shareButton.innerHTML = '<i class="fas fa-share-alt"></i> Compartir';
    
    // Inicializar el sonido cuando se crea el botón
    initShareSound();
    
    // Crear el menú de compartir
    const shareMenu = document.createElement('div');
    shareMenu.className = 'share-menu';
    shareMenu.innerHTML = `
        <div class="share-options">
            <button class="share-option" data-type="whatsapp">
                <i class="fab fa-whatsapp"></i> WhatsApp
            </button>
            <button class="share-option" data-type="facebook">
                <i class="fab fa-facebook"></i> Facebook
            </button>
            <button class="share-option" data-type="telegram">
                <i class="fab fa-telegram"></i> Telegram
            </button>
            <button class="share-option" data-type="copy">
                <i class="fas fa-link"></i> Copiar Link
            </button>
            <button class="share-option" data-type="image">
                <i class="fas fa-image"></i> Descargar Imagen
            </button>
        </div>
    `;

    shareButton.onclick = async (event) => {
        event.preventDefault();
        console.log('🖱️ Clic detectado en el botón compartir');
        
        if (!currentProduct) {
            console.log('⚠️ No hay producto seleccionado');
            return;
        }
        
        console.log('✨ Producto actual:', currentProduct.nombre);
        console.log('🎵 Llamando a playShareSound()...');
        playShareSound();
        console.log('🔊 Clic en botón compartir - reproduciendo sonido');

        // Generate shareable link and text
        const productLink = `https://www.montaqueshops.com/#${encodeURIComponent(currentProduct.nombre)}`;
        const shareText = `¡Mira este producto en Montaque!\n\n${currentProduct.nombre}\n${product.descuento ? `¡${product.descuento}% de DESCUENTO! ` : ''}Precio: $${product.precio.toFixed(2)}`;
        
        // Check if the Web Share API is available
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Montaque - ' + currentProduct.nombre,
                    text: shareText,
                    url: productLink
                });
                return;
            } catch (err) {
                // Si el usuario cancela o hay error, mostrar el menú normal
                console.log('Error al compartir:', err);
            }
        }
        
        // Si Web Share API no está disponible o falló, mostrar menú personalizado
        shareMenu.classList.toggle('show');
        
        // Handle share options
        const options = shareMenu.querySelectorAll('.share-option');
        options.forEach(option => {
            option.onclick = async (e) => {
                e.stopPropagation();
                const type = option.dataset.type;
                
                // Reproducir el sonido al seleccionar una opción
                playShareSound();
                
                switch(type) {
                    case 'whatsapp':
                    case 'facebook':
                    case 'telegram':
                        await shareOnSocialMedia(type, { url: productLink, text: shareText });
                        break;
                    case 'copy':
                        await copyToClipboard(productLink);
                        break;
                    case 'image':
                        await generateProductImage(currentProduct);
                        break;
                }
                
                shareMenu.classList.remove('show');
            };
        });
    };

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!shareButton.contains(e.target) && !shareMenu.contains(e.target)) {
            shareMenu.classList.remove('show');
        }
    });

    // Insert the button and menu after the product image
    const productImage = productDetail.querySelector('.product-image');
    if (productImage) {
        const container = document.createElement('div');
        container.className = 'share-container';
        container.appendChild(shareButton);
        container.appendChild(shareMenu);
        productImage.parentNode.insertBefore(container, productImage.nextSibling);
    }
}
