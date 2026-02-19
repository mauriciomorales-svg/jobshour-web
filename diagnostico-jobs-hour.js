// Script de diagnóstico para JobsHour
// Copia este código y pégalo en la consola del navegador (F12 → Console)

(function() {
    console.clear();
    console.log('%c🔧 DIAGNÓSTICO JOBSHOUR', 'font-size:20px;font-weight:bold;color:#f59e0b');
    console.log('=====================================\n');

    // 1. Verificar estado del worker
    const workerStatus = window.workerStatus || 'No definido';
    console.log('%c📊 Estado del Worker:', 'font-weight:bold', workerStatus);

    // 2. Verificar token
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    console.log('%c🔑 Token existe:', 'font-weight:bold', !!token);
    if (token) {
        console.log('   Token preview:', token.substring(0, 20) + '...');
    }

    // 3. Verificar usuario
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    console.log('%c👤 Usuario:', 'font-weight:bold', user.name || 'No hay usuario');

    // 4. Verificar estado de React (si está disponible)
    const reactRoot = document.querySelector('#__next');
    console.log('%c⚛️ React montado:', 'font-weight:bold', !!reactRoot);

    // 5. Buscar el botón de Modo Trabajo
    const botones = Array.from(document.querySelectorAll('button'));
    const modoTrabajoBtn = botones.find(b => b.textContent.includes('Modo Trabajo'));
    console.log('%c🖱️ Botón Modo Trabajo encontrado:', 'font-weight:bold', !!modoTrabajoBtn);
    
    if (modoTrabajoBtn) {
        console.log('   Texto:', modoTrabajoBtn.textContent.trim());
        console.log('   Disabled:', modoTrabajoBtn.disabled);
        console.log('   Pointer events:', getComputedStyle(modoTrabajoBtn).pointerEvents);
        
        // Simular click programáticamente
        console.log('\n%c🧪 SIMULANDO CLICK...', 'font-size:14px;font-weight:bold;color:#3b82f6');
        
        // Crear evento de click
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        
        modoTrabajoBtn.dispatchEvent(clickEvent);
        console.log('   ✅ Evento de click disparado');
        
        // Verificar si hay modales
        setTimeout(() => {
            const modales = document.querySelectorAll('[class*="fixed"], [class*="modal"]');
            console.log('\n%c📦 Modales detectados:', 'font-weight:bold', modales.length);
            modales.forEach((m, i) => {
                const visible = getComputedStyle(m).display !== 'none' && getComputedStyle(m).visibility !== 'hidden';
                if (visible) {
                    console.log(`   Modal ${i + 1}:`, m.className.substring(0, 50) + '...');
                }
            });
        }, 500);
    }

    // 6. Verificar event listeners
    console.log('\n%c🔍 INSPECCIÓN DE EVENTOS', 'font-size:14px;font-weight:bold;color:#8b5cf6');
    
    // Función para forzar el modal (prueba directa)
    window.forzarModalHabilidades = function() {
        console.log('%c🚀 FORZANDO APERTURA DE MODAL', 'font-weight:bold;color:#22c55e');
        
        // Buscar la función setShowCategoryRequiredModal en el scope de React
        const reactFiber = reactRoot?._reactRootContainer?._internalRoot?.current;
        console.log('React Fiber encontrado:', !!reactFiber);
        
        // Intentar acceder al estado de React
        if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
            console.log('React DevTools disponible - puedes inspeccionar el componente page.tsx');
        }
        
        // Crear modal manualmente si no existe
        let modal = document.getElementById('modal-habilidades');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modal-habilidades';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                padding: 20px;
            `;
            modal.innerHTML = `
                <div style="
                    background: white;
                    border-radius: 24px;
                    padding: 24px;
                    max-width: 400px;
                    width: 100%;
                    text-align: center;
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
                ">
                    <div style="
                        width: 64px;
                        height: 64px;
                        background: #fef3c7;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 16px;
                        font-size: 32px;
                    ">⚙️</div>
                    <h3 style="font-size: 20px; font-weight: 900; margin-bottom: 8px;">Configura tu perfil</h3>
                    <p style="font-size: 14px; color: #6b7280; margin-bottom: 24px;">
                        Necesitas seleccionar al menos una habilidad para poder activar el modo trabajo.
                    </p>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <button onclick="window.irAPerfil()" style="
                            background: linear-gradient(135deg, #fbbf24, #f97316);
                            color: white;
                            border: none;
                            padding: 16px;
                            border-radius: 12px;
                            font-weight: 900;
                            font-size: 16px;
                            cursor: pointer;
                        ">Ir a Mi Perfil →</button>
                        <button onclick="document.getElementById('modal-habilidades').remove()" style="
                            background: #f3f4f6;
                            color: #374151;
                            border: none;
                            padding: 12px;
                            border-radius: 12px;
                            font-weight: 700;
                            font-size: 14px;
                            cursor: pointer;
                        ">Cancelar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            console.log('✅ Modal creado manualmente');
        } else {
            modal.style.display = 'flex';
            console.log('✅ Modal ya existía, mostrando...');
        }
    };
    
    // Función para ir al perfil
    window.irAPerfil = function() {
        // Remover modal
        const modal = document.getElementById('modal-habilidades');
        if (modal) modal.remove();
        
        // Simular click en menú
        const menuBtn = Array.from(document.querySelectorAll('button')).find(b => 
            b.textContent.includes('MENÚ') || b.textContent.includes('Menú')
        );
        if (menuBtn) {
            menuBtn.click();
            setTimeout(() => {
                const perfilBtn = Array.from(document.querySelectorAll('button, a')).find(b => 
                    b.textContent.includes('Perfil') || b.textContent.includes('PERFIL')
                );
                if (perfilBtn) perfilBtn.click();
            }, 300);
        }
    };

    console.log('\n%c✨ COMANDOS DISPONIBLES:', 'font-size:14px;font-weight:bold;color:#10b981');
    console.log('   window.forzarModalHabilidades() - Muestra el modal manualmente');
    console.log('   window.irAPerfil() - Navega al perfil (después de forzar modal)');
    console.log('\n%c👉 Para forzar el modal ahora, ejecuta:', 'font-weight:bold');
    console.log('   forzarModalHabilidades()');

})();
