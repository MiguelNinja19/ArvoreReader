// ==UserScript==
// @name         ÁrvoreReader
// @name:pt-BR   ÁrvoreReader
// @namespace    https://github.com/MiguelNinja19/ArvoreReader
// @version      1.2.0
// @description  Leitor automático para a plataforma Árvore (e-reader.arvore.com.br). Avança as páginas automaticamente com intervalos aleatórios configuráveis entre um tempo mínimo e máximo.
// @description:pt-BR  Leitor automático para a plataforma Árvore (e-reader.arvore.com.br). Avança as páginas automaticamente com intervalos aleatórios configuráveis entre um tempo mínimo e máximo.
// @author       JuniorSchueller
// @match        https://e-reader.arvore.com.br/*
// @icon         https://i.imgur.com/9n0wbej.png
// @run-at       document-idle
// @noframes
// @require      https://cdn.jsdelivr.net/npm/toastify-js@1.12.0/src/toastify.min.js
// @resource     toastify-css https://cdn.jsdelivr.net/npm/toastify-js@1.12.0/src/toastify.min.css
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @license      MIT
// @homepageURL  https://github.com/MiguelNinja19/ArvoreReader
// @supportURL   
// @compatible   scriptcat
// @compatible   tampermonkey
// @compatible   greasemonkey
// ==/UserScript==

/* eslint-disable no-undef */

/*
 * ÁrvoreReader - Userscript
 * Original author: JuniorSchueller (https://discord.com/users/452563077683216395)
 * Source: https://github.com/JuniorSchueller/ArvoreReader
 *
 * Compatível com: ScriptCat, Tampermonkey e Greasemonkey 4+
 *
 * Estratégia de compatibilidade:
 *  - Usa @require para carregar o Toastify JS antes da execução (suportado pelos 3).
 *  - Usa @resource + GM_getResourceText + GM_addStyle para o CSS (TM/SC nativos; GM4 via polyfill).
 *  - Mantém fallback de injeção <link>/<script> caso GM APIs não estejam disponíveis (ex.: GM4 sem GM_getResourceText).
 */

(function () {
    'use strict';

    /* ------------------------------------------------------------------ *
     * 1. Injeção do CSS do Toastify (com fallback para GM4)
     * ------------------------------------------------------------------ */
    function injectToastifyCSS() {
        // Caminho primário: GM_getResourceText + GM_addStyle (TM/SC)
        try {
            if (typeof GM_getResourceText === 'function' && typeof GM_addStyle === 'function') {
                const css = GM_getResourceText('toastify-css');
                if (css) {
                    GM_addStyle(css);
                    return;
                }
            }
        } catch (e) {
            console.warn('[ÁrvoreReader] Falha ao injetar CSS via GM APIs, usando fallback <link>.', e);
        }

        // Fallback: injeção de <link> (funciona em qualquer gerenciador)
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/toastify-js@1.12.0/src/toastify.min.css';
        document.head.appendChild(link);
    }

    /* ------------------------------------------------------------------ *
     * 2. Garantir que Toastify esteja disponível (fallback dinâmico)
     * ------------------------------------------------------------------ */
    function ensureToastify(callback) {
        if (typeof Toastify === 'function') {
            callback();
            return;
        }
        // Tenta carregar dinamicamente (fallback para GM4 sem @require)
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/toastify-js@1.12.0/src/toastify.min.js';
        script.onload = () => callback();
        script.onerror = () => {
            console.error('[ÁrvoreReader] Não foi possível carregar o Toastify.');
            callback(); // Continua mesmo sem Toastify (a UI ainda funciona)
        };
        document.head.appendChild(script);
    }

    /* ------------------------------------------------------------------ *
     * 3. Toast helper (com fallback silencioso)
     * ------------------------------------------------------------------ */
    function showToast(text) {
        try {
            if (typeof Toastify === 'function') {
                Toastify({
                    text,
                    duration: 3000,
                    close: true,
                    gravity: 'bottom',
                    position: 'right',
                    backgroundColor: 'linear-gradient(to right, #00b09b, #96c93d)',
                    stopOnFocus: true,
                }).showToast();
            } else {
                console.log('[ÁrvoreReader]', text);
            }
        } catch (e) {
            console.log('[ÁrvoreReader]', text);
        }
    }

    /* ------------------------------------------------------------------ *
     * 4. Lógica principal (preservada do script original)
     * ------------------------------------------------------------------ */
    function arvoreReader() {
        let isStopped = true;

        /* ----- Busca dinâmica do botão de próxima página -----
         * O seletor original usa classes sc-* do styled-components,
         * que mudam a cada build. Estratégias em ordem de preferência:
         * 1. aria-label (mais estável quando existe)
         * 2. Seletor original (compatibilidade com builds antigos)
         * 3. Heurística: botão com seta para a direita no canto direito
         * 4. Fallback posicional: último botão visível do canto direito
         */
        let cachedNextButton = null;

        function findNextPageButton() {
            // 1. aria-label
            const byAria = document.querySelector(
                'button[aria-label*="próxima" i], button[aria-label*="proxima" i], button[aria-label*="avançar" i], button[aria-label*="avancar" i], button[aria-label*="next" i]'
            );
            if (byAria) return byAria;

            // 2. Seletor original
            const bySelector = document.querySelector(
                '#root > main > div.sc-gTRrQi.cFSQkY > div:nth-child(3) > button'
            );
            if (bySelector) return bySelector;

            // 3. Heurística: botão com seta para direita no canto direito da viewport
            const buttons = Array.from(document.querySelectorAll('button'));
            const visibleRightButtons = buttons.filter(b => {
                const r = b.getBoundingClientRect();
                if (r.width === 0 || r.height === 0) return false;
                if (r.right < window.innerWidth * 0.6) return false;
                // Tem SVG?
                const svg = b.querySelector('svg');
                if (!svg) return false;
                // Heurística de seta direita: largura do svg maior que altura OU path com H (horizontal)
                const sr = svg.getBoundingClientRect();
                const path = svg.querySelector('path');
                if (path) {
                    const d = (path.getAttribute('d') || '').toLowerCase();
                    // Setas direita comuns: arrow-forward (M4 11h12...), chevron-right (M9 6l6 6...)
                    if (d.includes('h12') || d.includes('h14') || d.includes('h16') ||
                        /l\s*6\s*[, ]?\s*6|m9\s*[, ]?\s*6/.test(d)) {
                        return true;
                    }
                }
                // Setas que apontam para direita costumam ser mais largas que altas
                return sr.width > sr.height * 1.2;
            });
            if (visibleRightButtons.length > 0) {
                // Pega o mais à direita
                visibleRightButtons.sort((a, b) =>
                    b.getBoundingClientRect().right - a.getBoundingClientRect().right
                );
                return visibleRightButtons[0];
            }

            // 4. Fallback posicional: último botão visível no canto inferior direito
            const allVisible = buttons.filter(b => {
                const r = b.getBoundingClientRect();
                return r.width > 0 && r.height > 0 && r.right > window.innerWidth * 0.7;
            });
            if (allVisible.length > 0) {
                allVisible.sort((a, b) =>
                    b.getBoundingClientRect().right - a.getBoundingClientRect().right
                );
                return allVisible[0];
            }

            return null;
        }

        function getNextPageButton() {
            if (cachedNextButton && cachedNextButton.isConnected) return cachedNextButton;
            cachedNextButton = findNextPageButton();
            return cachedNextButton;
        }

        // Reanexa quando o React recria o DOM (SPA)
        const domObserver = new MutationObserver(() => {
            cachedNextButton = null; // invalida cache
        });
        domObserver.observe(document.body, { childList: true, subtree: true });

        // Botão flutuante
        const floatingButton = document.createElement('div');
        floatingButton.style.cssText = [
            'position: fixed',
            'top: 20px',
            'right: 20px',
            'left: auto',
            'width: 60px',
            'height: 60px',
            'border-radius: 50%',
            'background: #ffffff',
            'display: flex',
            'align-items: center',
            'justify-content: center',
            'cursor: grab',
            'box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2)',
            'transition: background 0.3s ease',
            'z-index: 1000',
            'user-select: none',
            '-webkit-user-select: none',
            'touch-action: none',
            'will-change: left, top',
        ].join(';');

        const img = document.createElement('img');
        img.src = 'https://i.imgur.com/9n0wbej.png';
        img.style.cssText = [
            'width: 50px',
            'height: auto',
            'border-radius: 50%',
            'object-fit: cover',
            'pointer-events: none',
        ].join(';');
        floatingButton.appendChild(img);
        document.body.appendChild(floatingButton);

        // Menu
        const menu = document.createElement('div');
        menu.style.cssText = [
            'position: fixed',
            'top: 80px',
            'right: 20px',
            'left: auto',
            'width: 320px',
            'background-color: #ffffff',
            'padding: 20px',
            'border-radius: 15px',
            'box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15)',
            'display: none',
            'z-index: 1000',
            'transition: opacity 0.3s ease',
            'opacity: 0',
            'user-select: none',
            '-webkit-user-select: none',
            'touch-action: none',
            'will-change: left, top',
        ].join(';');

        // Cabeçalho do menu (área arrastável)
        const menuHeader = document.createElement('div');
        menuHeader.style.cssText = [
            'margin: -20px -20px 16px -20px',
            'padding: 14px 20px',
            'border-bottom: 1px solid #eaeaea',
            'border-radius: 15px 15px 0 0',
            'cursor: grab',
            'display: flex',
            'align-items: center',
            'justify-content: space-between',
            'background: #f8f9fa',
        ].join(';');
        menu.appendChild(menuHeader);

        const title = document.createElement('h2');
        title.innerText = 'ÁrvoreReader';
        title.style.cssText = [
            'margin: 0',
            'font-size: 18px',
            'color: #007bff',
            'text-align: center',
            'flex: 1',
            'font-weight: 700',
        ].join(';');
        menuHeader.appendChild(title);

        // Botão de fechar o menu
        const menuClose = document.createElement('span');
        menuClose.innerText = '×';
        menuClose.style.cssText = [
            'font-size: 22px',
            'color: #999',
            'cursor: pointer',
            'line-height: 1',
            'padding: 0 4px',
            'user-select: none',
        ].join(';');
        menuClose.title = 'Fechar';
        menuHeader.appendChild(menuClose);
        menuClose.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.style.display = 'none';
        });

        // Input: tempo mínimo
        const speedMinLabel = document.createElement('label');
        speedMinLabel.innerText = 'Tempo mínimo para passar a página (em segundos):';
        speedMinLabel.style.cssText = [
            'font-weight: bold',
            'color: #333',
            'margin-top: 20px',
            'margin-bottom: 8px',
            'display: block',
        ].join(';');
        menu.appendChild(speedMinLabel);

        const speedMinInput = document.createElement('input');
        speedMinInput.type = 'number';
        speedMinInput.value = 5;
        speedMinInput.step = 1;
        speedMinInput.min = 1;
        speedMinInput.style.cssText = [
            'width: 100%',
            'padding: 10px',
            'border: 1px solid #ccc',
            'border-radius: 8px',
            'font-size: 14px',
            'color: #333',
            'transition: all 0.3s ease',
            'box-sizing: border-box',
            'background: #f9f9f9',
            'outline: none',
        ].join(';');
        speedMinInput.addEventListener('focus', () => {
            speedMinInput.style.borderColor = '#007bff';
            speedMinInput.style.background = '#f1f9ff';
        });
        speedMinInput.addEventListener('blur', () => {
            speedMinInput.style.borderColor = '#ccc';
            speedMinInput.style.background = '#f9f9f9';
        });
        menu.appendChild(speedMinInput);

        // Input: tempo máximo
        const speedMaxLabel = document.createElement('label');
        speedMaxLabel.innerText = 'Tempo máximo para passar a página (em segundos):';
        speedMaxLabel.style.cssText = [
            'font-weight: bold',
            'color: #333',
            'margin-top: 20px',
            'margin-bottom: 8px',
            'display: block',
        ].join(';');
        menu.appendChild(speedMaxLabel);

        const speedMaxInput = document.createElement('input');
        speedMaxInput.type = 'number';
        speedMaxInput.value = 10;
        speedMaxInput.step = 1;
        speedMaxInput.min = 0;
        speedMaxInput.style.cssText = [
            'width: 100%',
            'padding: 10px',
            'border: 1px solid #ccc',
            'border-radius: 8px',
            'font-size: 14px',
            'color: #333',
            'transition: all 0.3s ease',
            'box-sizing: border-box',
            'background: #f9f9f9',
            'outline: none',
        ].join(';');
        speedMaxInput.addEventListener('focus', () => {
            speedMaxInput.style.borderColor = '#007bff';
            speedMaxInput.style.background = '#f1f9ff';
        });
        speedMaxInput.addEventListener('blur', () => {
            speedMaxInput.style.borderColor = '#ccc';
            speedMaxInput.style.background = '#f9f9f9';
        });
        menu.appendChild(speedMaxInput);

        // Botão Iniciar/Parar
        const startButton = document.createElement('button');
        startButton.innerText = 'Iniciar';
        startButton.style.cssText = [
            'margin-top: 20px',
            'width: 100%',
            'padding: 12px',
            'background: linear-gradient(to right, #00b09b, #96c93d)',
            'color: white',
            'border: none',
            'border-radius: 8px',
            'font-size: 16px',
            'cursor: pointer',
            'transition: background 0.3s ease, transform 0.2s ease',
            'box-sizing: border-box',
        ].join(';');
        startButton.addEventListener('mouseenter', () => {
            startButton.style.transform = 'scale(1.05)';
        });
        startButton.addEventListener('mouseleave', () => {
            startButton.style.transform = 'scale(1)';
        });
        menu.appendChild(startButton);

        document.body.appendChild(menu);

        // Animação de entrada do menu
        setTimeout(() => {
            menu.style.opacity = '1';
        }, 100);

        /* ----- Helpers ----- */
        function secondsToMilliseconds(seconds) {
            return seconds * 1000;
        }

        function randomAtRange(min, max) {
            if (max < min) max = min; // proteção contra input invertido
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        function read() {
            if (!isStopped) {
                const nextPageButton = getNextPageButton();
                if (nextPageButton) {
                    nextPageButton.click();
                    showToast('[ÁrvoreReader] Página Avançada!');
                } else {
                    showToast('[ÁrvoreReader] Botão de próxima página não encontrado. Tentando novamente...');
                }
                const min = Math.max(1, Number(speedMinInput.value) || 1);
                const max = Math.max(min, Number(speedMaxInput.value) || min);
                setTimeout(read, secondsToMilliseconds(randomAtRange(min, max)));
            }
        }

        /* ----- Persistência de posição ----- */
        const POS_KEY = 'arvoreReader:positions';
        function loadPositions() {
            try {
                return JSON.parse(localStorage.getItem(POS_KEY) || '{}');
            } catch (e) {
                return {};
            }
        }
        function savePosition(name, x, y) {
            const all = loadPositions();
            all[name] = { x, y };
            try {
                localStorage.setItem(POS_KEY, JSON.stringify(all));
            } catch (e) {
                /* storage indisponível — ignora */
            }
        }

        function clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        }

        // Aplica posição salva (se existir) a um elemento
        function applySavedPosition(el, name, defaultTop, defaultRight) {
            const saved = loadPositions()[name];
            if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
                el.style.left = saved.x + 'px';
                el.style.top = saved.y + 'px';
                el.style.right = 'auto';
            } else {
                el.style.top = defaultTop + 'px';
                el.style.right = defaultRight + 'px';
                el.style.left = 'auto';
            }
        }

        applySavedPosition(floatingButton, 'floatingButton', 20, 20);
        applySavedPosition(menu, 'menu', 80, 20);

        // Re-aplica clamp ao redimensionar a janela
        window.addEventListener('resize', () => {
            const fbRect = floatingButton.getBoundingClientRect();
            floatingButton.style.left = clamp(fbRect.left, 0, window.innerWidth - fbRect.width) + 'px';
            floatingButton.style.top = clamp(fbRect.top, 0, window.innerHeight - fbRect.height) + 'px';
            floatingButton.style.right = 'auto';

            const mRect = menu.getBoundingClientRect();
            if (mRect.width > 0) {
                menu.style.left = clamp(mRect.left, 0, window.innerWidth - mRect.width) + 'px';
                menu.style.top = clamp(mRect.top, 0, window.innerHeight - mRect.height) + 'px';
                menu.style.right = 'auto';
            }
        });

        /* ----- Drag genérico usando Pointer Events (mouse + touch + pen) -----
         * Vantagens do Pointer Events:
         *  - setPointerCapture garante que continuamos recebendo move/up
         *    mesmo saindo do elemento ou da janela (resolve o bug de arrasto travar)
         *  - Unifica mouse e touch num único listener
         *  - Não polui o document com listeners globais
         */
        function makeDraggable(handleEl, targetEl, name, onClickAfterDrag) {
            let dragging = false;
            let moved = false;
            let activePointerId = null;
            let startX = 0, startY = 0;
            let startLeft = 0, startTop = 0;
            let elWidth = 0, elHeight = 0;
            const DRAG_THRESHOLD = 5; // px — clique vs arraste

            function onPointerDown(e) {
                // Só botão esquerdo (mouse) ou toque/caneta
                if (e.button !== undefined && e.button !== 0) return;
                if (dragging) return; // já está arrastando

                dragging = true;
                moved = false;
                activePointerId = e.pointerId;
                startX = e.clientX;
                startY = e.clientY;

                // Cachear dimensões UMA VEZ — evita reflow a cada move (causa do flickering)
                const rect = targetEl.getBoundingClientRect();
                startLeft = rect.left;
                startTop = rect.top;
                elWidth = rect.width;
                elHeight = rect.height;

                targetEl.style.right = 'auto';
                targetEl.style.left = startLeft + 'px';
                targetEl.style.top = startTop + 'px';
                handleEl.style.cursor = 'grabbing';
                targetEl.style.transition = 'none';

                // Captura o pointer no handle — eventos subsequentes vão para ele
                try { handleEl.setPointerCapture(e.pointerId); } catch (err) {}

                e.preventDefault();
            }

            function onPointerMove(e) {
                if (!dragging || e.pointerId !== activePointerId) return;

                const dx = e.clientX - startX;
                const dy = e.clientY - startY;

                // Threshold: só considera arraste se moveu além de N pixels
                if (!moved) {
                    if (Math.abs(dx) <= DRAG_THRESHOLD && Math.abs(dy) <= DRAG_THRESHOLD) return;
                    moved = true;
                }

                // Usa dimensões cacheadas (sem getBoundingClientRect no move)
                const newLeft = clamp(startLeft + dx, 0, window.innerWidth - elWidth);
                const newTop = clamp(startTop + dy, 0, window.innerHeight - elHeight);
                targetEl.style.left = newLeft + 'px';
                targetEl.style.top = newTop + 'px';

                if (e.cancelable) e.preventDefault();
            }

            function onPointerUp(e) {
                if (!dragging || e.pointerId !== activePointerId) return;
                dragging = false;
                activePointerId = null;

                try { handleEl.releasePointerCapture(e.pointerId); } catch (err) {}

                handleEl.style.cursor = 'grab';
                targetEl.style.transition = '';

                if (moved) {
                    const rect = targetEl.getBoundingClientRect();
                    savePosition(name, rect.left, rect.top);
                } else if (typeof onClickAfterDrag === 'function') {
                    onClickAfterDrag();
                }
            }

            handleEl.addEventListener('pointerdown', onPointerDown);
            handleEl.addEventListener('pointermove', onPointerMove);
            handleEl.addEventListener('pointerup', onPointerUp);
            handleEl.addEventListener('pointercancel', onPointerUp);
            // Caso raro: pointer sai da janela sem captura
            handleEl.addEventListener('lostpointercapture', onPointerUp);
        }

        // Botão flutuante: arrasta pelo próprio botão, clique abre/fecha menu
        makeDraggable(floatingButton, floatingButton, 'floatingButton', () => {
            menu.style.display = (menu.style.display === 'none' || menu.style.display === '') ? 'block' : 'none';
            if (menu.style.display === 'block') {
                // Reposiciona o menu perto do botão, à esquerda ou abaixo
                const fbRect = floatingButton.getBoundingClientRect();
                const mWidth = 320 + 40; // width + padding
                let left;
                if (fbRect.left > mWidth + 10) {
                    left = fbRect.left - mWidth - 10; // abre à esquerda
                } else {
                    left = clamp(fbRect.left, 0, window.innerWidth - mWidth);
                }
                let top = clamp(fbRect.bottom + 10, 0, window.innerHeight - 200);
                menu.style.left = left + 'px';
                menu.style.top = top + 'px';
                menu.style.right = 'auto';
                // Não salva: deixa o menu acompanhar o botão ao reabrir
            }
        });

        // Menu: arrasta pelo cabeçalho, sem ação de clique
        makeDraggable(menuHeader, menu, 'menu', null);

        /* ----- Eventos ----- */
        startButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isStopped) {
                isStopped = false;
                startButton.innerText = 'Parar';
                read();
            } else {
                isStopped = true;
                startButton.innerText = 'Iniciar';
            }
        });
    }

    /* ------------------------------------------------------------------ *
     * 5. Boot
     * ------------------------------------------------------------------ */
    function boot() {
        if (location.hostname !== 'e-reader.arvore.com.br') {
            window.alert('[ÁrvoreReader] Você deve usar o script no Árvore.');
            window.open('https://arvore.com.br/');
            return;
        }

        // Espera o DOM estar minimamente pronto
        const start = () => {
            injectToastifyCSS();
            ensureToastify(() => {
                try {
                    arvoreReader();
                    showToast('ÁrvoreReader carregado com sucesso! 🚀');
                } catch (e) {
                    console.error('[ÁrvoreReader] Erro ao inicializar:', e);
                }
            });
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', start, { once: true });
        } else {
            start();
        }
    }

    boot();
})();
