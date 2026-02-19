// Botón flotante de emergencia para activar modo trabajo
// Este script crea un botón independiente que no depende del componente React principal

(function() {
    // Verificar si ya existe el botón
    if (document.getElementById('emergency-mode-btn')) {
        console.log('Botón de emergencia ya existe');
        return;
    }

    // Crear el botón
    const btn = document.createElement('button');
    btn.id = 'emergency-mode-btn';
    btn.innerHTML = '⚡ ACTIVAR MODO TRABAJO';
    btn.style.cssText = `
        position: fixed;
        bottom: 100px;
        right: 20px;
        z-index: 99999;
        background: linear-gradient(135deg, #fbbf24, #f97316);
        color: white;
        border: none;
        padding: 16px 24px;
        border-radius: 16px;
        font-weight: 900;
        font-size: 16px;
        cursor: pointer;
        box-shadow: 0 10px 25px -5px rgba(249, 115, 22, 0.4);
        transition: transform 0.2s;
        font-family: system-ui, -apple-system, sans-serif;
    `;

    // Hover effect
    btn.onmouseenter = () => btn.style.transform = 'scale(1.05)';
    btn.onmouseleave = () => btn.style.transform = 'scale(1)';

    // Click handler
    btn.onclick = function() {
        const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
        
        if (!token) {
            alert('No hay sesión activa. Por favor inicia sesión.');
            return;
        }

        console.log('⚡ Activando modo trabajo...');

        fetch('https://jobshour.dondemorales.cl/api/v1/worker/status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                status: 'active',
                lat: -37.67,
                lng: -72.57,
            }),
        })
        .then(res => res.json())
        .then(data => {
            console.log('Respuesta:', data);
            
            if (data.status === 'success') {
                alert('✅ Modo trabajo activado!');
                location.reload(); // Recargar para ver cambios
            } else if (data.code === 'REQUIRE_CATEGORY') {
                // Crear modal de habilidades
                const modal = document.createElement('div');
                modal.id = 'skills-modal';
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
                    z-index: 100000;
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
                        <h3 style="font-size: 20px; font-weight: 900; margin-bottom: 8px; color: #111827;">Configura tu perfil</h3>
                        <p style="font-size: 14px; color: #6b7280; margin-bottom: 24px;">
                            Necesitas seleccionar al menos una habilidad para poder activar el modo trabajo y aparecer en el mapa.
                        </p>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <button id="goto-profile-btn" style="
                                background: linear-gradient(135deg, #fbbf24, #f97316);
                                color: white;
                                border: none;
                                padding: 16px;
                                border-radius: 12px;
                                font-weight: 900;
                                font-size: 16px;
                                cursor: pointer;
                            ">Ir a Mi Perfil →</button>
                            <button id="cancel-modal-btn" style="
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
                
                // Manejar botones del modal
                document.getElementById('goto-profile-btn').onclick = function() {
                    // Intentar abrir el perfil
                    const profileBtn = Array.from(document.querySelectorAll('button')).find(b => 
                        b.textContent.includes('Perfil') || b.textContent.includes('PERFIL')
                    );
                    
                    if (profileBtn) {
                        profileBtn.click();
                    } else {
                        // Si no encontramos el botón, intentar otro método
                        const menuBtn = Array.from(document.querySelectorAll('button')).find(b => 
                            b.textContent.includes('MENÚ') || b.textContent.includes('Menú')
                        );
                        if (menuBtn) {
                            menuBtn.click();
                            setTimeout(() => {
                                const sidebarProfile = Array.from(document.querySelectorAll('button, a')).find(b => 
                                    b.textContent.toLowerCase().includes('perfil')
                                );
                                if (sidebarProfile) sidebarProfile.click();
                            }, 500);
                        }
                    }
                    modal.remove();
                };
                
                document.getElementById('cancel-modal-btn').onclick = function() {
                    modal.remove();
                };
                
            } else {
                alert('Error: ' + (data.message || 'No se pudo activar'));
            }
        })
        .catch(err => {
            console.error('Error:', err);
            alert('Error de conexión. Intenta nuevamente.');
        });
    };

    // Agregar al DOM
    document.body.appendChild(btn);
    
    console.log('✅ Botón de emergencia creado! Presiónalo para activar modo trabajo.');
})();
