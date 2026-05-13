# QA manual — solo mapa (JobsHours web)

Usá esta lista cuando quieras **refinar solo la experiencia del mapa** en varios celulares y lugares. Anotá: modelo, OS, navegador, red (4G/Wi‑Fi), ciudad o “GPS simulado”, y si hubo error el **`X-Request-Id`** de cualquier respuesta API que hayas visto en red.

**Preparación mínima**

- [ ] URL fija (p. ej. `https://jobshours.com`).
- [ ] Saber si probás **con sesión** (para ver estados worker) o **sin login** (solo exploración pública del mapa).

---

## Carga y red (impacto directo en el mapa)

| # | Caso | OK | Notas |
|---|------|-----|--------|
| M1 | Primera carga del home: **mapa visible** (tiles + marcadores o cluster) | | |
| M2 | Misma URL con **solo 4G/5G** | | |
| M3 | **Recarga dura** (pull-to-refresh o F5) con el mapa ya desplazado | | |
| M4 | Pestaña **2 min en segundo plano**, volver: mapa usable sin pantalla blanca fija | | |

---

## Geolocalización

| # | Caso | OK | Notas |
|---|------|-----|--------|
| G1 | **Permitir** ubicación: el mapa se centra razonablemente cerca de vos | | |
| G2 | **Denegar** ubicación: igual podés usar el mapa (centro por defecto / mensaje claro) | | |
| G3 | **Otra ubicación** (viaje real o GPS simulado en Android): marcadores / lista coherente con la zona | | |
| G4 | Si existe **zona piloto** en prod: probar **dentro** y **justo fuera** del borde | | |

---

## Interacción mapa (gestos y rendimiento)

| # | Caso | OK | Notas |
|---|------|-----|--------|
| I1 | **Zoom** rápido (pinch / rueda): sin congelarse de forma prolongada | | |
| I2 | **Pan** largo arrastrando varias veces seguidas | | |
| I3 | Tocar **marcador** o cluster: abre ficha / modal; **cerrar** y el mapa sigue respondiendo | | |
| I4 | Abrir ficha, **mover el mapa** detrás, volver a tocar otro marcador | | |
| I5 | **Rotación** del teléfono (si aplica): mapa no queda roto o ilegible | | |

---

## Lista / feed ligado al mapa (si lo usás en la misma pantalla)

| # | Caso | OK | Notas |
|---|------|-----|--------|
| L1 | Al mover el mapa, la lista o resultados **se actualizan** o muestran estado de carga claro | | |
| L2 | Si falla la red: **mensaje de error** visible (toast / texto), no silencio total | | |

---

## Tiempo real (solo si el mapa muestra presencia en vivo)

| # | Caso | OK | Notas |
|---|------|-----|--------|
| R1 | Con dos dispositivos: cambio de estado / posición se refleja sin recargar toda la página (o con retraso aceptable) | | |

---

## Cierre de ronda

- Fecha: _______________
- Dispositivos: _______________
- **Bloqueantes mapa:** _______________
- **Mejoras UX (no bloqueante):** _______________

Lista completa multi-módulo: `docs/MANUAL-QA-DISPOSITIVOS.md`.
