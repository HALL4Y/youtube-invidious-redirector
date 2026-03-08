// ==UserScript==
// @name         Youtube Invidious Redirector
// @name:fr      Redirection YouTube Invidious
// @namespace    https://github.com/HALL4Y/youtube-invidious-redirector
// @version      2.5.0
// @description  Redirect YouTube videos to an Invidious instance and manage instances from a floating UI.
// @license      MPL-2.0
// @homepageURL  https://github.com/HALL4Y/youtube-invidious-redirector
// @supportURL   https://github.com/HALL4Y/youtube-invidious-redirector/issues
// @updateURL    https://raw.githubusercontent.com/HALL4Y/youtube-invidious-redirector/main/youtube-to-invidious-efficient-auto-redirector.user.js
// @downloadURL  https://raw.githubusercontent.com/HALL4Y/youtube-invidious-redirector/main/youtube-to-invidious-efficient-auto-redirector.user.js
// @match        *://www.youtube.com/*
// @match        *://m.youtube.com/*
// @match        *://youtube.com/*
// @match        *://inv.nadeko.net/*
// @match        *://yewtu.be/*
// @match        *://invidious.nerdvpn.de/*
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// @run-at       document-end
// ==/UserScript==

/*
 * Version: 2.5.0
 * Modifie: 2026-03-08 07:30:00
 * Role: Redirect YouTube watch URLs to Invidious and provide a floating selector UI.
 * Inputs: Current page URL, userscript storage values, user clicks, configured Invidious instance URLs.
 * Outputs: Browser redirects, DOM UI, persisted preferences in userscript storage.
 * Dependances: Userscript manager with GM_* APIs (Violentmonkey/Tampermonkey/Greasemonkey), browser DOM APIs.
 * Usage: Install in a userscript manager, visit YouTube or a matched Invidious instance, then choose an instance from the floating icon.
 */

(function() {
    'use strict';

    const CONFIG = {
        defaultInstanceKey: 'defaultInstance',
        customInstancesKey: 'customInstances',
        iconPositionKey: 'iconPosition',
        defaultInstances: [
            'https://inv.nadeko.net',
            'https://yewtu.be',
            'https://invidious.nerdvpn.de'
        ],
        showIconDelay: 800
    };

    const YOUTUBE_HOSTS = new Set([
        'www.youtube.com',
        'm.youtube.com',
        'youtube.com'
    ]);

    let redirectionEnabled = true;
    let isProcessingRedirection = false;
    let iconCreated = false;
    let interfaceCreated = false;

    function saveIconPosition(x, y) {
        GM_setValue(CONFIG.iconPositionKey, JSON.stringify({
            x: Math.round(x),
            y: Math.round(y),
            timestamp: Date.now()
        }));
    }

    function getIconPosition() {
        try {
            const saved = GM_getValue(CONFIG.iconPositionKey);
            if (saved) {
                const position = JSON.parse(saved);
                if (typeof position.x === 'number' && typeof position.y === 'number') {
                    return {
                        x: position.x,
                        y: position.y
                    };
                }
            }
        } catch (error) {
            console.error('Erreur lecture position icone:', error);
        }

        return {
            x: window.innerWidth - 64,
            y: 20
        };
    }

    function extractAllParams(url) {
        try {
            const urlObj = new URL(url);
            const params = {};

            urlObj.searchParams.forEach((value, key) => {
                params[key] = value;
            });

            if (urlObj.pathname.includes('/shorts/')) {
                const shortId = urlObj.pathname.split('/shorts/')[1]?.split('?')[0]?.split('/')[0];
                if (shortId && shortId.length === 11) {
                    params.v = shortId;
                }
            }

            return Object.keys(params).length > 0 ? params : null;
        } catch {
            return null;
        }
    }

    function buildInvidiousURL(instance, params) {
        if (!params || !params.v) return null;

        try {
            const url = new URL(instance);
            const videoId = params.v;

            url.pathname = videoId.length === 11 ? '/watch' : '/playlist';
            url.searchParams.set(videoId.length === 11 ? 'v' : 'list', videoId);

            if (params.t) url.searchParams.set('t', params.t);
            if (params.list && videoId.length === 11) url.searchParams.set('list', params.list);
            if (params.index) url.searchParams.set('index', params.index);
            url.searchParams.set('autoplay', '1');

            return url.toString();
        } catch (error) {
            console.error('Erreur construction URL:', error);
            return null;
        }
    }

    function saveDefaultInstance(instance) {
        if (instance === 'none') {
            GM_deleteValue(CONFIG.defaultInstanceKey);
        } else {
            GM_setValue(CONFIG.defaultInstanceKey, instance);
        }
    }

    function getDefaultInstance() {
        return GM_getValue(CONFIG.defaultInstanceKey);
    }

    function getCustomInstances() {
        const instances = GM_getValue(CONFIG.customInstancesKey, '[]');
        try {
            return JSON.parse(instances);
        } catch {
            return [];
        }
    }

    function saveCustomInstances(instances) {
        GM_setValue(CONFIG.customInstancesKey, JSON.stringify(instances));
    }

    function addCustomInstance(instance) {
        const instances = getCustomInstances();
        if (!instances.includes(instance)) {
            instances.push(instance);
            saveCustomInstances(instances);
            return true;
        }
        return false;
    }

    function removeCustomInstance(instance) {
        const instances = getCustomInstances();
        const index = instances.indexOf(instance);
        if (index > -1) {
            instances.splice(index, 1);
            saveCustomInstances(instances);
            return true;
        }
        return false;
    }

    function clearDefaultInstance() {
        GM_deleteValue(CONFIG.defaultInstanceKey);
    }

    function getKnownInvidiousHosts() {
        const hosts = [];

        for (const instance of CONFIG.defaultInstances) {
            try {
                hosts.push(new URL(instance).hostname);
            } catch {
                // Ignore invalid configured URLs.
            }
        }

        for (const instance of getCustomInstances()) {
            try {
                hosts.push(new URL(instance).hostname);
            } catch {
                // Ignore invalid stored URLs.
            }
        }

        return hosts;
    }

    function isYouTubeHost(hostname) {
        return YOUTUBE_HOSTS.has(hostname);
    }

    function isKnownInvidiousHost(hostname) {
        return getKnownInvidiousHosts().includes(hostname);
    }

    function redirectToInvidious(instance, params) {
        if (!redirectionEnabled || isProcessingRedirection || instance === 'none') return false;

        const invidiousURL = buildInvidiousURL(instance, params);
        if (!invidiousURL) return false;

        const currentURL = window.location.href;
        if (currentURL.includes(instance) || currentURL === invidiousURL) {
            return false;
        }

        console.log(`Redirection vers: ${invidiousURL}`);
        isProcessingRedirection = true;

        // Stop YouTube page loading to prevent navigation interception
        window.stop();

        // Multiple fallback strategies for redirect
        try {
            window.location.replace(invidiousURL);
        } catch (_e) {
            window.location.href = invidiousURL;
        }

        // Last resort if replace/href were intercepted
        setTimeout(() => {
            window.location.href = invidiousURL;
        }, 100);
        return true;
    }

    function returnToYouTube() {
        const params = extractAllParams(window.location.href);

        if (params && params.v) {
            redirectionEnabled = false;
            clearDefaultInstance();

            const youtubeURL = new URL('https://www.youtube.com/watch');
            Object.entries(params).forEach(([key, value]) => {
                if (key !== 'autoplay') {
                    youtubeURL.searchParams.set(key, value);
                }
            });

            window.location.href = youtubeURL.toString();
        } else {
            window.location.href = 'https://www.youtube.com';
        }
    }

    function updateStatusDisplay() {
        const statusText = document.getElementById('invidiousStatusText');
        const ledIndicator = document.getElementById('invidiousLedIndicator');
        const ledText = document.getElementById('invidiousLedText');

        if (statusText && ledIndicator && ledText) {
            const defaultInstance = getDefaultInstance();
            const isEnabled = defaultInstance && defaultInstance !== 'none';

            redirectionEnabled = !!isEnabled;
            ledIndicator.style.backgroundColor = isEnabled ? '#4CAF50' : '#f44336';
            ledIndicator.style.boxShadow = `0 0 8px ${isEnabled ? '#4CAF50' : '#f44336'}`;
            ledText.textContent = isEnabled ? 'ACTIVE' : 'INACTIVE';
            ledText.style.color = isEnabled ? '#4CAF50' : '#f44336';
            statusText.textContent = isEnabled
                ? `Redirection vers: ${defaultInstance}`
                : 'Redirection desactivee';
        }
    }

    function updateIconHalo() {
        const halo = document.getElementById('invidiousIconHalo');
        if (!halo) return;

        const defaultInstance = getDefaultInstance();
        const isEnabled = defaultInstance && defaultInstance !== 'none';

        halo.style.background = isEnabled
            ? 'radial-gradient(circle, rgba(76,175,80,0.4) 0%, rgba(76,175,80,0.2) 70%, transparent 100%)'
            : 'radial-gradient(circle, rgba(244,67,54,0.4) 0%, rgba(244,67,54,0.2) 70%, transparent 100%)';

        halo.style.boxShadow = isEnabled
            ? '0 0 15px rgba(76,175,80,0.5)'
            : '0 0 15px rgba(244,67,54,0.5)';
    }

    function createInterface() {
        if (interfaceCreated) return;
        interfaceCreated = true;

        const modal = document.createElement('div');
        modal.id = 'invidiousModal';
        Object.assign(modal.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'none',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '10000'
        });

        const modalContent = document.createElement('div');
        Object.assign(modalContent.style, {
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
            padding: '25px',
            borderRadius: '12px',
            minWidth: '450px',
            maxWidth: '500px',
            color: '#fff',
            fontFamily: 'Arial, sans-serif',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            border: '1px solid #444'
        });

        const title = document.createElement('h3');
        title.textContent = 'Instance Invidious';
        title.style.marginTop = '0';
        title.style.marginBottom = '20px';
        title.style.color = '#fff';
        title.style.borderBottom = '2px solid #4CAF50';
        title.style.paddingBottom = '10px';
        modalContent.appendChild(title);

        const statusContainer = document.createElement('div');
        Object.assign(statusContainer.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#2a2a2a',
            borderRadius: '8px'
        });

        const statusText = document.createElement('div');
        statusText.id = 'invidiousStatusText';
        statusText.style.color = '#ccc';
        statusText.style.fontSize = '14px';

        const ledContainer = document.createElement('div');
        Object.assign(ledContainer.style, {
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
        });

        const ledIndicator = document.createElement('div');
        ledIndicator.id = 'invidiousLedIndicator';
        Object.assign(ledIndicator.style, {
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: 'red',
            boxShadow: '0 0 8px currentColor'
        });

        const ledText = document.createElement('span');
        ledText.id = 'invidiousLedText';
        ledText.style.color = '#ccc';
        ledText.style.fontSize = '12px';

        ledContainer.appendChild(ledIndicator);
        ledContainer.appendChild(ledText);
        statusContainer.appendChild(statusText);
        statusContainer.appendChild(ledContainer);
        modalContent.appendChild(statusContainer);

        const instancesList = document.createElement('div');
        instancesList.id = 'invidiousInstancesList';
        instancesList.style.maxHeight = '300px';
        instancesList.style.overflowY = 'auto';
        instancesList.style.marginBottom = '20px';
        instancesList.style.paddingRight = '10px';

        function createInstanceItem(instance, isDefault, isCustom, labelText = null) {
            const container = document.createElement('div');
            Object.assign(container.style, {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px',
                marginBottom: '8px',
                backgroundColor: '#3a3a3a',
                borderRadius: '6px',
                border: isDefault ? '2px solid #4CAF50' : '1px solid #444',
                cursor: 'pointer'
            });

            container.addEventListener('mouseenter', () => {
                if (!isDefault) container.style.backgroundColor = '#444';
            });

            container.addEventListener('mouseleave', () => {
                if (!isDefault) container.style.backgroundColor = '#3a3a3a';
            });

            const leftPart = document.createElement('div');
            Object.assign(leftPart.style, {
                display: 'flex',
                alignItems: 'center',
                flex: '1'
            });

            const radio = document.createElement('input');
            Object.assign(radio, {
                type: 'radio',
                name: 'instance',
                value: instance,
                checked: isDefault,
                id: `instance_${instance.replace(/[^a-zA-Z0-9]/g, '_')}`
            });
            radio.style.marginRight = '10px';
            radio.style.cursor = 'pointer';

            const label = document.createElement('label');
            label.htmlFor = radio.id;
            Object.assign(label.style, {
                cursor: 'pointer',
                flex: '1',
                color: isDefault ? '#4CAF50' : '#fff'
            });

            const labelMainText = document.createElement('span');
            labelMainText.textContent = labelText || instance;
            label.appendChild(labelMainText);

            if (isDefault) {
                const badge = document.createElement('span');
                badge.style.marginLeft = '10px';
                badge.style.fontSize = '0.9em';
                if (instance === 'none') {
                    badge.textContent = '(Desactivee)';
                    badge.style.color = '#ff4444';
                } else {
                    badge.textContent = '(Par defaut)';
                    badge.style.color = '#4CAF50';
                }
                label.appendChild(badge);
            } else if (isCustom) {
                const customBadge = document.createElement('span');
                customBadge.textContent = '(Personnalisee)';
                customBadge.style.marginLeft = '10px';
                customBadge.style.color = '#888';
                customBadge.style.fontSize = '0.9em';
                label.appendChild(customBadge);
            }

            leftPart.appendChild(radio);
            leftPart.appendChild(label);

            const rightPart = document.createElement('div');
            let deleteBtn = null;

            if (isCustom) {
                deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.title = 'Supprimer';
                Object.assign(deleteBtn.style, {
                    background: 'none',
                    border: 'none',
                    color: '#ff4444',
                    cursor: 'pointer',
                    fontSize: '12px',
                    marginLeft: '10px',
                    padding: '2px 6px'
                });

                deleteBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    if (confirm(`Supprimer l'instance ${instance} ?`)) {
                        removeCustomInstance(instance);
                        updateInstancesList();
                        updateStatusDisplay();
                        updateIconHalo();
                    }
                });

                rightPart.appendChild(deleteBtn);
            }

            container.appendChild(leftPart);
            container.appendChild(rightPart);

            container.addEventListener('click', (event) => {
                if (event.target !== radio && event.target !== deleteBtn && !event.target.closest('button')) {
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change'));
                }
            });

            radio.addEventListener('change', () => {
                if (!radio.checked) return;

                saveDefaultInstance(instance);
                updateInstancesList();
                updateStatusDisplay();
                updateIconHalo();

                if (isYouTubeHost(window.location.hostname) && instance !== 'none') {
                    const params = extractAllParams(window.location.href);
                    if (params) {
                        setTimeout(() => {
                            redirectToInvidious(instance, params);
                        }, 300);
                    }
                }
            });

            return container;
        }

        function isValidInstanceURL(url) {
            try {
                const urlObj = new URL(url);
                return urlObj.protocol === 'https:' &&
                    urlObj.hostname.includes('.') &&
                    (!urlObj.pathname || urlObj.pathname === '/');
            } catch {
                return false;
            }
        }

        function updateInstancesList() {
            instancesList.replaceChildren();
            const defaultInstance = getDefaultInstance();

            instancesList.appendChild(createInstanceItem('none', !defaultInstance, false, 'Aucune'));

            const separator1 = document.createElement('div');
            Object.assign(separator1.style, {
                height: '1px',
                backgroundColor: '#444',
                margin: '10px 0',
                width: '100%'
            });
            instancesList.appendChild(separator1);

            CONFIG.defaultInstances.forEach((instance) => {
                instancesList.appendChild(createInstanceItem(instance, defaultInstance === instance, false));
            });

            const customInstances = getCustomInstances();
            if (customInstances.length > 0) {
                const separator2 = document.createElement('div');
                Object.assign(separator2.style, {
                    height: '1px',
                    backgroundColor: '#444',
                    margin: '15px 0',
                    width: '100%'
                });
                instancesList.appendChild(separator2);
            }

            customInstances.forEach((instance) => {
                instancesList.appendChild(createInstanceItem(instance, defaultInstance === instance, true));
            });

            const addInstanceContainer = document.createElement('div');
            Object.assign(addInstanceContainer.style, {
                marginTop: '15px',
                padding: '10px',
                backgroundColor: '#333',
                borderRadius: '6px'
            });

            const addInput = document.createElement('input');
            Object.assign(addInput, {
                type: 'text',
                placeholder: 'https://instance.invidious',
                id: 'newInstanceInput'
            });
            Object.assign(addInput.style, {
                width: 'calc(100% - 90px)',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #555',
                backgroundColor: '#222',
                color: '#fff',
                marginRight: '10px'
            });

            const addButton = document.createElement('button');
            addButton.textContent = 'Ajouter';
            Object.assign(addButton.style, {
                padding: '8px 15px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
            });

            addButton.addEventListener('click', () => {
                const url = addInput.value.trim();
                if (url && isValidInstanceURL(url)) {
                    if (addCustomInstance(url)) {
                        addInput.value = '';
                        updateInstancesList();
                        updateStatusDisplay();
                        updateIconHalo();
                    }
                } else {
                    alert('URL invalide. Format: https://domaine.tld (sans chemin)');
                }
            });

            addInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    addButton.click();
                }
            });

            addInstanceContainer.appendChild(addInput);
            addInstanceContainer.appendChild(addButton);
            instancesList.appendChild(addInstanceContainer);
        }

        modalContent.appendChild(instancesList);
        updateInstancesList();
        updateStatusDisplay();

        const buttonsContainer = document.createElement('div');
        Object.assign(buttonsContainer.style, {
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end'
        });

        if (isKnownInvidiousHost(window.location.hostname)) {
            const youtubeBtn = document.createElement('button');
            youtubeBtn.textContent = 'Retour a YouTube';
            Object.assign(youtubeBtn.style, {
                padding: '10px 20px',
                backgroundColor: '#ff4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold'
            });

            youtubeBtn.addEventListener('click', () => {
                returnToYouTube();
            });

            buttonsContainer.appendChild(youtubeBtn);
        }

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Fermer';
        Object.assign(closeBtn.style, {
            padding: '10px 20px',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
        });

        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        buttonsContainer.appendChild(closeBtn);
        modalContent.appendChild(buttonsContainer);

        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });

        modal.appendChild(modalContent);
        document.body.appendChild(modal);
    }

    function createFloatingIcon() {
        if (iconCreated) return;

        if (document.getElementById('invidiousIconContainer')) {
            iconCreated = true;
            updateIconHalo();
            return;
        }

        iconCreated = true;

        const iconContainer = document.createElement('div');
        iconContainer.id = 'invidiousIconContainer';

        const savedPosition = getIconPosition();
        const maxX = window.innerWidth - 44;
        const maxY = window.innerHeight - 44;
        const posX = Math.min(Math.max(savedPosition.x, 10), maxX);
        const posY = Math.min(Math.max(savedPosition.y, 10), maxY);

        Object.assign(iconContainer.style, {
            position: 'fixed',
            left: `${posX}px`,
            top: `${posY}px`,
            width: '44px',
            height: '44px',
            cursor: 'pointer',
            zIndex: '9999',
            userSelect: 'none',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
        });

        const halo = document.createElement('div');
        halo.id = 'invidiousIconHalo';
        Object.assign(halo.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(76,175,80,0.3) 0%, rgba(76,175,80,0.1) 70%, transparent 100%)',
            animation: 'pulse 2s infinite',
            pointerEvents: 'none'
        });

        const icon = document.createElement('img');
        Object.assign(icon, {
            src: 'https://inv.nadeko.net/favicon.ico',
            alt: 'Invidious',
            id: 'invidiousIcon',
            draggable: false
        });
        Object.assign(icon.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'white',
            padding: '6px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            transition: 'transform 0.2s',
            pointerEvents: 'none'
        });

        if (!document.getElementById('invidiousPulseStyle')) {
            const style = document.createElement('style');
            style.id = 'invidiousPulseStyle';
            style.textContent = '\n                @keyframes pulse {\n                    0% { transform: scale(1); opacity: 0.8; }\n                    50% { transform: scale(1.1); opacity: 1; }\n                    100% { transform: scale(1); opacity: 0.8; }\n                }\n            ';
            document.head.appendChild(style);
        }

        iconContainer.addEventListener('mouseenter', () => {
            icon.style.transform = 'scale(1.1)';
        });

        iconContainer.addEventListener('mouseleave', () => {
            icon.style.transform = 'scale(1)';
        });

        iconContainer.addEventListener('click', (event) => {
            event.stopPropagation();
            let modal = document.getElementById('invidiousModal');
            if (!modal) {
                createInterface();
                modal = document.getElementById('invidiousModal');
            }
            if (modal) {
                modal.style.display = 'flex';
                updateStatusDisplay();
            }
        });

        let isDragging = false;
        let startX;
        let startY;
        let startLeft;
        let startTop;

        iconContainer.addEventListener('mousedown', (event) => {
            isDragging = true;
            startX = event.clientX;
            startY = event.clientY;
            const rect = iconContainer.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            iconContainer.style.cursor = 'grabbing';
            iconContainer.style.opacity = '0.8';
            event.preventDefault();
        });

        document.addEventListener('mousemove', (event) => {
            if (!isDragging) return;

            const deltaX = event.clientX - startX;
            const deltaY = event.clientY - startY;
            let newLeft = startLeft + deltaX;
            let newTop = startTop + deltaY;
            const maxDragX = window.innerWidth - iconContainer.offsetWidth;
            const maxDragY = window.innerHeight - iconContainer.offsetHeight;

            newLeft = Math.max(10, Math.min(newLeft, maxDragX - 10));
            newTop = Math.max(10, Math.min(newTop, maxDragY - 10));

            iconContainer.style.left = `${newLeft}px`;
            iconContainer.style.top = `${newTop}px`;
        });

        document.addEventListener('mouseup', () => {
            if (!isDragging) return;

            isDragging = false;
            iconContainer.style.cursor = 'pointer';
            iconContainer.style.opacity = '1';
            const finalLeft = parseInt(iconContainer.style.left, 10) || 0;
            const finalTop = parseInt(iconContainer.style.top, 10) || 0;
            saveIconPosition(finalLeft, finalTop);
        });

        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const rect = iconContainer.getBoundingClientRect();
                const maxResizeX = window.innerWidth - 44;
                const maxResizeY = window.innerHeight - 44;

                if (rect.right > window.innerWidth || rect.bottom > window.innerHeight) {
                    const newX = Math.min(rect.left, maxResizeX - 10);
                    const newY = Math.min(rect.top, maxResizeY - 10);
                    iconContainer.style.left = `${newX}px`;
                    iconContainer.style.top = `${newY}px`;
                    saveIconPosition(newX, newY);
                }
            }, 250);
        });

        iconContainer.appendChild(halo);
        iconContainer.appendChild(icon);
        document.body.appendChild(iconContainer);
        updateIconHalo();
    }

    function tryRedirect() {
        if (isProcessingRedirection || !redirectionEnabled) return;

        const defaultInstance = getDefaultInstance();
        if (!defaultInstance || defaultInstance === 'none') return;

        const params = extractAllParams(window.location.href);
        if (params && params.v) {
            redirectToInvidious(defaultInstance, params);
        }
    }

    function main() {
        const hostname = window.location.hostname;
        const isOnYouTube = isYouTubeHost(hostname);
        const isOnInvidious = isKnownInvidiousHost(hostname);

        if (isOnYouTube) {
            // Redirect ASAP — before YouTube sets up navigation interceptors
            tryRedirect();

            setTimeout(() => {
                createFloatingIcon();
            }, CONFIG.showIconDelay);

            setTimeout(() => {
                createInterface();
            }, 2000);

            // YouTube SPA navigation: detect URL changes when clicking videos
            document.addEventListener('yt-navigate-finish', () => {
                isProcessingRedirection = false;
                tryRedirect();
            });

            // Fallback: intercept pushState/replaceState for robustness
            const originalPushState = history.pushState;
            history.pushState = function() {
                originalPushState.apply(this, arguments);
                setTimeout(() => {
                    isProcessingRedirection = false;
                    tryRedirect();
                }, 500);
            };

            const originalReplaceState = history.replaceState;
            history.replaceState = function() {
                originalReplaceState.apply(this, arguments);
                setTimeout(() => {
                    isProcessingRedirection = false;
                    tryRedirect();
                }, 500);
            };

            window.addEventListener('popstate', () => {
                isProcessingRedirection = false;
                tryRedirect();
            });
        } else if (isOnInvidious) {
            setTimeout(() => {
                createFloatingIcon();
                createInterface();
            }, 500);
        }
    }

    GM_addValueChangeListener(CONFIG.defaultInstanceKey, (_key, _oldValue, newValue) => {
        const isEnabled = newValue && newValue !== 'none';
        redirectionEnabled = !!isEnabled;
        updateStatusDisplay();
        updateIconHalo();
    });

    main();

    GM_registerMenuCommand('Activer ou desactiver la redirection', () => {
        const currentInstance = getDefaultInstance();
        if (currentInstance && currentInstance !== 'none') {
            saveDefaultInstance('none');
            alert('Redirection desactivee');
        } else {
            saveDefaultInstance(CONFIG.defaultInstances[0]);
            alert(`Redirection activee vers: ${CONFIG.defaultInstances[0]}`);
        }
        location.reload();
    });

    GM_registerMenuCommand('Ouvrir le selecteur', () => {
        let modal = document.getElementById('invidiousModal');
        if (!modal) {
            createInterface();
            modal = document.getElementById('invidiousModal');
        }
        if (modal) {
            modal.style.display = 'flex';
            updateStatusDisplay();
        }
    });

    GM_registerMenuCommand('Effacer toutes les donnees', () => {
        if (confirm('Voulez-vous vraiment effacer toutes les donnees ?')) {
            clearDefaultInstance();
            saveCustomInstances([]);
            GM_deleteValue(CONFIG.iconPositionKey);
            alert('Donnees effacees. La page va se recharger.');
            location.reload();
        }
    });

    GM_registerMenuCommand('Reinitialiser position icone', () => {
        GM_deleteValue(CONFIG.iconPositionKey);
        const iconContainer = document.getElementById('invidiousIconContainer');
        if (iconContainer) {
            const maxX = window.innerWidth - 44;
            iconContainer.style.left = `${maxX}px`;
            iconContainer.style.top = '20px';
            saveIconPosition(maxX, 20);
            alert('Position de l\'icone reinitialisee');
        }
    });
})();
