     document.addEventListener('DOMContentLoaded', function() {
            
            // ==========================================
            // CONFIGURAÇÃO DO GOOGLE APPS SCRIPT (MACRO)
            // ==========================================
            const MACRO_URL = "https://script.google.com/macros/s/AKfycbzQYz49ZNVJFkIldgCtZ7c9UrhN9bvXql16ppuo5QVloj8kRlk5xgstaItKxmh9LF0g3g/exec"; 
            
            // COLE AQUI A URL GERADA NA PARTE 1 DESSE PROMPT!
            const MACRO_GRUPOS_URL = "https://script.google.com/macros/s/AKfycbxUZuOWPi2VFRP0fSrlIJuLOcF4XlSTs9V7d8YuPzqqNz95S98VlnKFFoSyxb-y0ZXxTw/exec"; 
            
            let LOGGED_IN_USER = "Visitante"; 
            const ITEMS_PER_PAGE = 6; 
            const ITEMS_PER_PAGE_ALL = 10; 
            // ==========================================

            // ==========================================
            // SISTEMA DE AUTENTICAÇÃO DO FÓRUM E GRUPOS
            // ==========================================
            async function pegarUsername() {
                try {
                    const resposta = await fetch("/forum");
                    const html = await resposta.text();
                    const regex = /_userdata\["username"\]\s*=\s*"([^"]+)"/;
                    const match = html.match(regex);
                    return match && match[1] ? match[1].trim() : null;
                } catch {
                    return null;
                }
            }

            function normalizarTextoForum(texto = '') {
                return String(texto || '').replace(/\s+/g, ' ').trim();
            }

            function isLinkPerfilDoForum(href = '') {
                return /(?:^|\/)u\d+(?:-[^/?#]+)?(?:[/?#]|$)/i.test(String(href || '').trim());
            }

            function isNomeMembroValido(nome = '') {
                const nomeNormalizado = normalizarTextoForum(nome);
                if (!nomeNormalizado) return false;
                return !/^um f[oó]rum gr[aá]tis$/i.test(nomeNormalizado);
            }

            async function pegarMembrosDoGrupo(grupoUrlBase) {
                try {
                    let start = 0;
                    const porPagina = 50;
                    let membros = [];

                    while (true) {
                        const url = start === 0 ? grupoUrlBase : `${grupoUrlBase}?start=${start}`;
                        const resposta = await fetch(url);
                        const html = await resposta.text();

                        const doc = new DOMParser().parseFromString(html, "text/html");
                        const linksMembros = [...doc.querySelectorAll('a[href*="/u"]')];
                        const nomes = linksMembros
                            .filter((a) => isLinkPerfilDoForum(a.getAttribute('href')))
                            .map((a) => normalizarTextoForum(a.textContent))
                            .filter((nome) => isNomeMembroValido(nome));

                        membros.push(...nomes);

                        const existeProxima = !!doc.querySelector(`a[href*="start=${start + porPagina}"]`);
                        if (!existeProxima) break;

                        start += porPagina;
                    }
                    return membros;
                } catch (e) {
                    console.error(`Erro ao buscar membros de ${grupoUrlBase}:`, e);
                    return [];
                }
            }

            function updateProfileUI(uName, isG1, isG2, isG3) {
                LOGGED_IN_USER = uName;
                const profileUsernameEl = document.getElementById('profileUsername');
                if (profileUsernameEl) profileUsernameEl.textContent = uName;

                let userRole = "Policial";
                if (isG2) userRole = "Administrador do Fórum";
                else if (isG1) userRole = "Especialização Intermediária";
                else if (isG3) userRole = "Oficial do Corpo Militar";

                const profileRoleEl = document.getElementById('profileRole');
                if (profileRoleEl) profileRoleEl.textContent = userRole;

                const profileAvatar = document.getElementById('profileAvatar');
                const profileIconFallback = document.getElementById('profileIconFallback');
                
                if (profileAvatar && profileIconFallback) {
                    profileAvatar.dataset.username = uName;
                    profileAvatar.dataset.hostIndex = '0';
                    profileAvatar.src = getHabboHeadUrl(uName, 0);
                    
                    profileAvatar.onload = function() {
                        this.classList.remove('hidden');
                        profileIconFallback.classList.add('hidden');
                    };
                    
                    profileAvatar.onerror = function() {
                        const nick = this.dataset.username || '';
                        const nextHostIndex = Number(this.dataset.hostIndex || 0) + 1;

                        if (nick && nextHostIndex <= 1) {
                            this.dataset.hostIndex = String(nextHostIndex);
                            this.src = getHabboHeadUrl(nick, nextHostIndex);
                        } else {
                            this.classList.add('hidden');
                            profileIconFallback.classList.remove('hidden');
                        }
                    };
                }
            }

            async function carregarOficiaisEPermissoes() {
                const username = await pegarUsername();
                
                const [membrosG1, membrosG2, membrosG3] = await Promise.all([
                    pegarMembrosDoGrupo("/g1-administradores"),
                    pegarMembrosDoGrupo("/g2-moderadores"),
                    pegarMembrosDoGrupo("/g3-testes")
                ]);

                const combined = [...membrosG1, ...membrosG2, ...membrosG3];
                if (combined.length > 0) {
                    oficiais = [...new Set(combined)].sort();
                } else {
                    oficiais = ["Oficial Alpha", "Oficial Beta", "Inspetor Silva", "Diretor Rocha", ".Brendon_Admin"]; 
                }
                isLoadingOficiais = false;
                
                if (username) {
                    const userLower = username.toLowerCase();
                    const estaNoG1 = membrosG1.some(n => n.toLowerCase() === userLower);
                    const estaNoG2 = membrosG2.some(n => n.toLowerCase() === userLower);
                    const estaNoG3 = membrosG3.some(n => n.toLowerCase() === userLower);

                    updateProfileUI(username, estaNoG1, estaNoG2, estaNoG3);

                    if (estaNoG3 || estaNoG1) {
                        document.getElementById('nav-solicitacoes').classList.remove('hidden');
                        const postagemTerceiroWrapper = document.getElementById('postagemTerceiroWrapper');
                        postagemTerceiroWrapper.classList.remove('hidden');
                        postagemTerceiroWrapper.classList.add('flex');
                    }

                    if (estaNoG2) {
                        document.getElementById('nav-todas-transferencias').classList.remove('hidden');
                    }

                } else {
                    LOGGED_IN_USER = "Visitante";
                    const profileUsernameEl = document.getElementById('profileUsername');
                    if (profileUsernameEl) profileUsernameEl.textContent = LOGGED_IN_USER;
                    const profileRoleEl = document.getElementById('profileRole');
                    if (profileRoleEl) profileRoleEl.textContent = "Acesso Restrito";
                    
                    const profileAvatar = document.getElementById('profileAvatar');
                    const profileIconFallback = document.getElementById('profileIconFallback');
                    if (profileAvatar) profileAvatar.classList.add('hidden');
                    if (profileIconFallback) profileIconFallback.classList.remove('hidden');

                    document.getElementById('nav-solicitacoes').classList.add('hidden');
                    document.getElementById('nav-todas-transferencias').classList.add('hidden');
                    document.getElementById('postagemTerceiroWrapper').classList.add('hidden');
                }
                
                if (MACRO_URL) {
                    loadSolicitacoesFromMacro(true);
                } else {
                    updatePendingCount();
                    renderRequestsGrid();
                    renderHistoryGrid();
                    renderAllTransfersList();
                }
                
                // Carrega dados das companhias (novo macro)
                loadGruposTarefas();
            }

            // Inicia o carregamento assim que o script sobe
            carregarOficiaisEPermissoes();

            // ==========================================
            // VARIÁVEIS DE ESTADO E REFERÊNCIAS UI
            // ==========================================
            const navButtons = {
                'nav-transferir': 'page-transferir',
                'nav-historico': 'page-historico',
                'nav-solicitacoes': 'page-solicitacoes',
                'nav-todas-transferencias': 'page-todas-transferencias'
            };
            const pageViews = document.querySelectorAll('.page-view');
            const select = document.querySelector('.custom-select');
            const selected = select.querySelector('.select-selected');
            const items = select.querySelector('.select-items');
            const input = select.querySelector('input[type="hidden"]');
            const icon = selected.querySelector('.ph-caret-down');
            
            let oficiais = []; 
            let isLoadingOficiais = true;

            // Arrays dinâmicos populados via Macro
            let companhiasData = [];
            let subcompanhiasData = [];
            
            const oficialInput = document.getElementById('oficialInput');
            const oficialSearchWrapper = document.getElementById('oficialSearchWrapper');
            const oficialSearchField = document.getElementById('oficialSearchField');
            const oficialDropdown = document.getElementById('oficialDropdown');
            const oficialHidden = document.getElementById('oficialHidden');
            const oficialPreview = document.getElementById('oficialPreview');
            const oficialPreviewFallback = document.getElementById('oficialPreviewFallback');
            const oficialSearchContainer = document.getElementById('oficialSearchContainer');
            
            const postagemTerceiroCheck = document.getElementById('postagemTerceiroCheck');
            const thirdPartyNicknameContainer = document.getElementById('thirdPartyNicknameContainer');
            const thirdPartyNicknameInput = document.getElementById('thirdPartyNicknameInput');
            
            const historyGrid = document.getElementById('historyGrid');
            const requestsQueue = document.getElementById('requestsQueue');
            const allTransfersList = document.getElementById('allTransfersList');
            const pendingCount = document.getElementById('pendingCount');
            const navPendingBadge = document.getElementById('navPendingBadge');
            const transferForm = document.getElementById('transferForm');
            
            const historySearchInput = document.getElementById('historySearchInput');
            const requestsSearchInput = document.getElementById('requestsSearchInput');
            const allSearchInput = document.getElementById('allSearchInput');

            const historyPagination = document.getElementById('historyPagination');
            const historyPrevBtn = document.getElementById('historyPrevBtn');
            const historyNextBtn = document.getElementById('historyNextBtn');
            const historyPageInfo = document.getElementById('historyPageInfo');
            
            const requestsPagination = document.getElementById('requestsPagination');
            const requestsPrevBtn = document.getElementById('requestsPrevBtn');
            const requestsNextBtn = document.getElementById('requestsNextBtn');
            const requestsPageInfo = document.getElementById('requestsPageInfo');

            const allPagination = document.getElementById('allPagination');
            const allPrevBtn = document.getElementById('allPrevBtn');
            const allNextBtn = document.getElementById('allNextBtn');
            const allPageInfo = document.getElementById('allPageInfo');

            const openSolicitacoesGuideButton = document.getElementById('openSolicitacoesGuide');
            const solicitacoesGuideLayer = document.getElementById('solicitacoesGuideLayer');
            const solicitacoesGuideBackdrop = document.getElementById('solicitacoesGuideBackdrop');
            const solicitacoesGuidePanel = document.getElementById('solicitacoesGuidePanel');
            const closeSolicitacoesGuideButton = document.getElementById('closeSolicitacoesGuide');
            
            const decisionModal = document.getElementById('decisionModal');
            const decisionForm = document.getElementById('decisionForm');
            const decisionModalTitle = document.getElementById('decisionModalTitle');
            const decisionModalDescription = document.getElementById('decisionModalDescription');
            const decisionFieldGroup = document.getElementById('decisionFieldGroup');
            const decisionNoteLabel = document.getElementById('decisionNoteLabel');
            const decisionNote = document.getElementById('decisionNote');
            const decisionError = document.getElementById('decisionError');
            const decisionSubmit = document.getElementById('decisionSubmit');
            const closeDecisionModalButton = document.getElementById('closeDecisionModal');

            let lastStandardPageId = 'page-transferir';
            let pendingDecisionContext = null;
            let solicitacoesGuideCloseTimer = null;
            
            let historyDataArr = [];
            let historyCurrentPage = 1;
            let historySearchQuery = '';

            let requestsDataArr = [];
            let requestsCurrentPage = 1;
            let requestsSearchQuery = '';

            let allTransfersDataArr = [];
            let allTransfersCurrentPage = 1;
            let allSearchQuery = '';

            // ==========================================
            // NOVO: CARREGAR GRUPOS DE TAREFAS VIA MACRO
            // ==========================================
            async function loadGruposTarefas() {
                if (!MACRO_GRUPOS_URL || MACRO_GRUPOS_URL === "COLE_A_URL_DO_NOVO_MACRO_AQUI") return;
                try {
                    const response = await fetch(MACRO_GRUPOS_URL);
                    const json = await response.json();
                    
                    if (json.status === "success") {
                        companhiasData = json.data.companhias;
                        subcompanhiasData = json.data.subcompanhias;
                    }
                } catch (error) {
                    console.error("Erro ao carregar dados das companhias:", error);
                }
            }

            // ==========================================
            // UTILITÁRIOS E FORMATAÇÃO DE DATA
            // ==========================================
            function escapeHTML(value = '') {
                return String(value)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            }

            function generateUniqueCode() {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                let result = 'RCCT';
                for (let i = 0; i < 5; i++) {
                    result += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                return result;
            }

            function formatBrasiliaDate(dateInput) {
                if (!dateInput) return 'Sem data';
                if (typeof dateInput === 'string' && dateInput.includes('às')) {
                    return dateInput;
                }

                let d = new Date(dateInput);
                
                if (isNaN(d.getTime())) {
                    if (typeof dateInput === 'string' && dateInput.includes('/')) {
                        return dateInput.replace(',', '').replace(' ', ' às ');
                    }
                    return String(dateInput); 
                }

                const options = {
                    timeZone: 'America/Sao_Paulo',
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                    hour12: false
                };
                
                const formatter = new Intl.DateTimeFormat('pt-BR', options);
                let formattedStr = formatter.format(d);
                
                const parts = formattedStr.split(/,?\s+/);
                if (parts.length === 2) {
                    return `${parts[0]} às ${parts[1]}`;
                }
                
                return formattedStr;
            }

            function formatBrasiliaTimestamp(dateInput) {
                let d = new Date(dateInput);
                if (isNaN(d.getTime())) return '';

                const options = {
                    timeZone: 'America/Sao_Paulo',
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                    hour12: false
                };
                const formatter = new Intl.DateTimeFormat('pt-BR', options);
                let str = formatter.format(d); 
                str = str.replace(',', '').replace(' ', ', ');
                return str;
            }

            // ==========================================
            // FUNÇÕES DE INTERFACE (MODAIS E MENUS)
            // ==========================================
            function syncThirdPartyMode() {
                const byThird = postagemTerceiroCheck.checked;
                thirdPartyNicknameContainer.classList.toggle('hidden', !byThird);
                oficialSearchContainer.classList.toggle('hidden', byThird);
                thirdPartyNicknameInput.required = byThird;
                thirdPartyNicknameInput.disabled = !byThird;

                if (byThird) {
                    oficialInput.value = '';
                    oficialHidden.value = '';
                    closeOficialDropdown();
                    resetOficialPreview();
                    return;
                }

                thirdPartyNicknameInput.value = '';
            }

            function openDecisionModal(action, requestCard) {
                pendingDecisionContext = { action, requestCard };
                decisionError.classList.add('hidden');
                decisionError.textContent = 'Não foi possível concluir a confirmação. Tente novamente.';
                decisionForm.reset();

                if (action === 'approved') {
                    decisionModalTitle.textContent = 'Confirmar Aprovação';
                    decisionModalDescription.textContent = 'Confirme a aprovação para concluir o pedido.';
                    decisionSubmit.textContent = 'Confirmar Aprovação';
                    decisionFieldGroup.classList.add('hidden');
                } else {
                    decisionModalTitle.textContent = 'Confirmar Recusa';
                    decisionModalDescription.textContent = 'Registre a confirmação que justifica esta recusa antes de encerrar o pedido.';
                    decisionNoteLabel.textContent = 'Confirmação da Recusa';
                    decisionNote.placeholder = 'Ex.: Provas insuficientes ou dados inconsistentes para aprovação.';
                    decisionSubmit.textContent = 'Confirmar Recusa';
                    decisionFieldGroup.classList.remove('hidden');
                    decisionError.textContent = 'Preencha o campo de confirmação para continuar.';
                }

                decisionModal.classList.remove('hidden');
                decisionModal.classList.add('flex');
                setTimeout(() => {
                    if (action === 'approved') {
                        decisionSubmit.focus();
                        return;
                    }
                    decisionNote.focus();
                }, 50);
            }

            function closeDecisionModal() {
                pendingDecisionContext = null;
                decisionModal.classList.add('hidden');
                decisionModal.classList.remove('flex');
                decisionError.classList.add('hidden');
                decisionError.textContent = 'Não foi possível concluir a confirmação. Tente novamente.';
                decisionFieldGroup.classList.remove('hidden');
            }

            function openSolicitacoesGuide() {
                clearTimeout(solicitacoesGuideCloseTimer);
                solicitacoesGuideLayer.classList.remove('hidden');
                requestAnimationFrame(() => {
                    solicitacoesGuideBackdrop.classList.remove('opacity-0');
                    solicitacoesGuidePanel.classList.remove('translate-x-full');
                });
            }

            function closeSolicitacoesGuide() {
                solicitacoesGuideBackdrop.classList.add('opacity-0');
                solicitacoesGuidePanel.classList.add('translate-x-full');
                clearTimeout(solicitacoesGuideCloseTimer);
                solicitacoesGuideCloseTimer = setTimeout(() => {
                    solicitacoesGuideLayer.classList.add('hidden');
                }, 300);
            }

            function setActiveNav(activeButtonId = null) {
                Object.keys(navButtons).forEach((buttonId) => {
                    const button = document.getElementById(buttonId);
                    button.classList.remove('nav-btn-active');
                    button.removeAttribute('aria-current');
                });

                if (!activeButtonId) return;
                const activeButton = document.getElementById(activeButtonId);
                activeButton.classList.add('nav-btn-active');
                activeButton.setAttribute('aria-current', 'page');
            }

            function showPage(pageId, activeButtonId = null) {
                if (pageId === 'page-todas-transferencias' && document.getElementById('nav-todas-transferencias').classList.contains('hidden')) return;
                if (pageId === 'page-solicitacoes' && document.getElementById('nav-solicitacoes').classList.contains('hidden')) return;

                closeSolicitacoesGuide();
                pageViews.forEach((page) => {
                    page.classList.add('translate-x-full', 'opacity-0', 'z-0');
                    page.classList.remove('translate-x-0', 'opacity-100', 'z-10');
                });

                const activePage = document.getElementById(pageId);
                if (!activePage) return;

                activePage.classList.remove('translate-x-full', 'opacity-0', 'z-0');
                activePage.classList.add('translate-x-0', 'opacity-100', 'z-10');
                setActiveNav(activeButtonId);
                
                if (MACRO_URL) {
                    if (pageId === 'page-solicitacoes') {
                        loadSolicitacoesFromMacro();
                    } else if (pageId === 'page-historico') {
                        loadHistoryFromMacro();
                    } else if (pageId === 'page-todas-transferencias') {
                        loadAllTransfersFromMacro();
                    }
                }
            }

            Object.keys(navButtons).forEach((buttonId) => {
                document.getElementById(buttonId).addEventListener('click', function() {
                    lastStandardPageId = navButtons[buttonId];
                    showPage(navButtons[buttonId], buttonId);
                });
            });

            selected.addEventListener('click', (event) => {
                event.stopPropagation();
                items.classList.toggle('hidden');
                icon.classList.toggle('rotate-180');
            });

            items.querySelectorAll('[data-value]').forEach((option) => {
                option.addEventListener('click', function() {
                    select.querySelector('.select-text').textContent = this.textContent;
                    select.querySelector('.select-text').classList.remove('opacity-70');
                    input.value = this.dataset.value;
                    items.classList.add('hidden');
                    icon.classList.remove('rotate-180');

                    const comprovacoesInput = document.getElementById('comprovacoesInput');
                    if (this.dataset.value === '6') {
                        comprovacoesInput.removeAttribute('required');
                        comprovacoesInput.placeholder = "Link das provas (Opcional para este motivo)";
                    } else {
                        comprovacoesInput.setAttribute('required', 'required');
                        comprovacoesInput.placeholder = "Link das provas (Imgur, Lightshot...)";
                    }
                });
            });

            function renderOficiais(filter = '') {
                oficialDropdown.innerHTML = '';

                if (isLoadingOficiais) {
                    oficialDropdown.innerHTML = '<div class="py-3 px-5 text-[10px] italic text-brand-textGray animate-pulse">Carregando lista de oficiais do fórum...</div>';
                    return;
                }

                const filtered = oficiais.filter((oficial) => oficial.toLowerCase().includes(filter.toLowerCase()));

                if (filtered.length === 0) {
                    oficialDropdown.innerHTML = '<div class="py-3 px-5 text-[10px] italic text-brand-textGray">Nenhum oficial encontrado...</div>';
                    return;
                }

                filtered.forEach((oficial) => {
                    const option = document.createElement('div');
                    option.className = 'py-3 px-5 hover:bg-brand-surface cursor-pointer text-[11px] font-bold flex items-center gap-2';
                    option.innerHTML = `<span class="w-1.5 h-1.5 bg-brand-green rounded-full"></span> ${escapeHTML(oficial)}`;
                    option.addEventListener('mousedown', (event) => {
                        event.preventDefault();
                    });
                    option.addEventListener('click', () => {
                        oficialInput.value = oficial;
                        oficialHidden.value = oficial;
                        oficialInput.setCustomValidity('');
                        updateOficialPreview(oficial);
                        closeOficialDropdown();
                    });
                    oficialDropdown.appendChild(option);
                });
            }

            function getMatchingOficial(value = '') {
                const nickname = String(value || '').trim().toLowerCase();
                if (!nickname) return '';
                return oficiais.find((oficial) => oficial.toLowerCase() === nickname) || '';
            }

            function syncOficialHiddenValue(value = '') {
                oficialHidden.value = getMatchingOficial(value);
            }

            function openOficialDropdown(filter = '') {
                renderOficiais(filter);
                oficialDropdown.classList.remove('hidden');
            }

            function closeOficialDropdown() {
                oficialDropdown.classList.add('hidden');
            }

            function getHabboHeadUrl(username, hostIndex = 0) {
                const hotels = ['https://www.habbo.com.br', 'https://www.habbo.com'];
                const nickname = String(username || '').trim();
                if (!nickname) return '';
                return `${hotels[hostIndex]}/habbo-imaging/avatarimage?user=${encodeURIComponent(nickname)}&headonly=1&size=m&direction=2&head_direction=3&gesture=sml`;
            }

            function resetOficialPreview() {
                oficialPreview.removeAttribute('src');
                oficialPreview.removeAttribute('data-username');
                oficialPreview.removeAttribute('data-host-index');
                oficialPreview.classList.add('hidden');
                oficialPreviewFallback.classList.remove('hidden');
            }

            function updateOficialPreview(username) {
                const nickname = String(username || '').trim();
                if (!nickname) {
                    resetOficialPreview();
                    return;
                }
                oficialPreview.dataset.username = nickname;
                oficialPreview.dataset.hostIndex = '0';
                oficialPreview.src = getHabboHeadUrl(nickname, 0);
            }

            oficialPreview.addEventListener('load', function() {
                if (!this.dataset.username) return;
                this.classList.remove('hidden');
                oficialPreviewFallback.classList.add('hidden');
            });

            oficialPreview.addEventListener('error', function() {
                const nickname = this.dataset.username || '';
                const nextHostIndex = Number(this.dataset.hostIndex || 0) + 1;

                if (nickname && nextHostIndex <= 1) {
                    this.dataset.hostIndex = String(nextHostIndex);
                    this.src = getHabboHeadUrl(nickname, nextHostIndex);
                    return;
                }
                resetOficialPreview();
            });

            oficialSearchWrapper.addEventListener('click', (event) => {
                event.stopPropagation();
            });

            oficialSearchField.addEventListener('click', () => {
                oficialInput.focus();
                openOficialDropdown(oficialInput.value);
            });

            oficialDropdown.addEventListener('click', (event) => {
                event.stopPropagation();
            });

            oficialInput.addEventListener('focus', () => {
                openOficialDropdown(oficialInput.value);
                updateOficialPreview(oficialInput.value);
            });

            oficialInput.addEventListener('input', (event) => {
                oficialInput.setCustomValidity('');
                syncOficialHiddenValue(event.target.value);
                openOficialDropdown(event.target.value);
                updateOficialPreview(event.target.value);
            });

            oficialInput.addEventListener('blur', () => {
                setTimeout(() => {
                    if (!oficialSearchWrapper.contains(document.activeElement)) {
                        closeOficialDropdown();
                    }
                }, 80);
            });

            thirdPartyNicknameInput.addEventListener('input', () => {
                thirdPartyNicknameInput.setCustomValidity('');
            });

            decisionNote.addEventListener('input', () => {
                decisionError.classList.add('hidden');
            });

            postagemTerceiroCheck.addEventListener('change', syncThirdPartyMode);
            syncThirdPartyMode();

            // FUNÇÕES ATUALIZADAS PARA LER AS ARRAYS DO MACRO
            function getCompanyOptionsMarkup(selectedCompany = '') {
                if (companhiasData.length === 0) {
                    return `<option value="">(Carregando... ou Vazio)</option>`;
                }
                return companhiasData.map((c) => {
                    return `<option value="${escapeHTML(c.name)}" data-topic-id="${escapeHTML(c.topicId)}"${c.name === selectedCompany ? ' selected' : ''}>${escapeHTML(c.name)}</option>`;
                }).join('');
            }

            function getSubCompanyOptionsMarkup(selectedSubCompanies = []) {
                if (subcompanhiasData.length === 0) {
                    return `<span class="text-[10px] text-brand-textGray block">(Carregando... ou Vazio)</span>`;
                }
                return subcompanhiasData.map((c) => `
                    <label class="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" data-topic-id="${escapeHTML(c.topicId)}" class="history-sub-checkbox sub-checkbox appearance-none w-3.5 h-3.5 border-2 border-brand-borderGray rounded flex items-center justify-center outline-none transition-all"${selectedSubCompanies.includes(c.name) ? ' checked' : ''}>
                        <span class="text-[10px] text-brand-navy font-medium transition-all">${escapeHTML(c.name)}</span>
                    </label>
                `).join('');
            }

            function closeHistoryPanels() {
                document.querySelectorAll('.history-gt-panel').forEach((panel) => panel.classList.add('hidden'));
            }

            // ==========================================
            // LÓGICA DE RENDERIZAÇÃO, PESQUISA E PAGINAÇÃO
            // ==========================================

            historySearchInput.addEventListener('input', (e) => {
                historySearchQuery = e.target.value.toLowerCase().trim();
                historyCurrentPage = 1;
                renderHistoryGrid();
            });

            requestsSearchInput.addEventListener('input', (e) => {
                requestsSearchQuery = e.target.value.toLowerCase().trim();
                requestsCurrentPage = 1;
                renderRequestsGrid();
            });

            allSearchInput.addEventListener('input', (e) => {
                allSearchQuery = e.target.value.toLowerCase().trim();
                allTransfersCurrentPage = 1;
                renderAllTransfersList();
            });

            function getFilteredAllTransfers() {
                if (!allTransfersDataArr) return [];
                return allTransfersDataArr.filter(req => {
                    if (!allSearchQuery) return true;
                    return (req.codigo && req.codigo.toLowerCase().includes(allSearchQuery)) ||
                           (req.solicitante && req.solicitante.toLowerCase().includes(allSearchQuery)) ||
                           (req.oficial && req.oficial.toLowerCase().includes(allSearchQuery)) ||
                           (req.novoNick && req.novoNick.toLowerCase().includes(allSearchQuery)) ||
                           (req.status && req.status.toLowerCase().includes(allSearchQuery));
                });
            }

            function updatePendingCount() {
                const total = requestsDataArr.length;
                const formattedTotal = String(total).padStart(2, '0');
                pendingCount.textContent = formattedTotal;
                navPendingBadge.textContent = total;
                navPendingBadge.classList.toggle('hidden', total === 0);
            }

            function renderRequestsGrid() {
                requestsQueue.innerHTML = '';
                
                if (requestsDataArr.length === 0) {
                    requestsPagination.classList.add('hidden');
                    requestsQueue.innerHTML = `
                        <div class="col-span-full bg-white/70 border border-dashed border-brand-borderGray rounded-[24px] p-8 text-center max-w-md mx-auto mt-4">
                            <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-brand-surface flex items-center justify-center text-brand-navy">
                                <img src="https://i.imgur.com/oqWtapx.png" alt="Vazio" class="w-8 h-8 object-contain">
                            </div>
                            <h4 class="text-sm font-black uppercase tracking-[0.2em] text-brand-navy mb-2">Fila zerada</h4>
                            <p class="text-[11px] text-brand-textGray">Nenhuma solicitação pendente atribuída a você.</p>
                        </div>
                    `;
                    updatePendingCount();
                    return;
                }

                // Filtrar
                const filteredData = requestsDataArr.filter(req => {
                    if (!requestsSearchQuery) return true;
                    return (req.codigo && req.codigo.toLowerCase().includes(requestsSearchQuery)) ||
                           (req.solicitante && req.solicitante.toLowerCase().includes(requestsSearchQuery)) ||
                           (req.novoNick && req.novoNick.toLowerCase().includes(requestsSearchQuery)) ||
                           (req.motivo && req.motivo.toLowerCase().includes(requestsSearchQuery));
                });

                if (filteredData.length === 0) {
                    requestsPagination.classList.add('hidden');
                    requestsQueue.innerHTML = `
                        <div class="col-span-full bg-white/70 border border-dashed border-brand-borderGray rounded-[24px] p-8 text-center max-w-md mx-auto mt-4">
                            <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-brand-surface flex items-center justify-center text-brand-navy">
                                <i class="ph-bold ph-magnifying-glass text-2xl"></i>
                            </div>
                            <h4 class="text-sm font-black uppercase tracking-[0.2em] text-brand-navy mb-2">Sem resultados</h4>
                            <p class="text-[11px] text-brand-textGray">Nenhum pedido atende à sua pesquisa.</p>
                        </div>
                    `;
                    updatePendingCount();
                    return;
                }

                const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
                if (requestsCurrentPage > totalPages) requestsCurrentPage = totalPages;
                if (requestsCurrentPage < 1) requestsCurrentPage = 1;

                const startIdx = (requestsCurrentPage - 1) * ITEMS_PER_PAGE;
                const endIdx = startIdx + ITEMS_PER_PAGE;
                const pageItems = filteredData.slice(startIdx, endIdx);

                pageItems.forEach(req => {
                    requestsQueue.appendChild(buildQueueRequestUI(req));
                });

                requestsPagination.classList.remove('hidden');
                requestsPageInfo.textContent = `Página ${requestsCurrentPage} de ${totalPages}`;
                requestsPrevBtn.disabled = requestsCurrentPage === 1;
                requestsNextBtn.disabled = requestsCurrentPage === totalPages;
                
                updatePendingCount();
            }

            function renderHistoryGrid() {
                historyGrid.innerHTML = '';

                if (historyDataArr.length === 0) {
                    historyPagination.classList.add('hidden');
                    historyGrid.innerHTML = `
                        <div class="col-span-full bg-white/70 border border-dashed border-brand-borderGray rounded-[24px] p-8 text-center max-w-md mx-auto mt-4">
                            <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-brand-surface flex items-center justify-center text-brand-navy">
                                <img src="https://i.imgur.com/oqWtapx.png" alt="Vazio" class="w-8 h-8 object-contain">
                            </div>
                            <h4 class="text-sm font-black uppercase tracking-[0.2em] text-brand-navy mb-2">Sem Histórico</h4>
                            <p class="text-[11px] text-brand-textGray">Você ainda não possui transferências registradas.</p>
                        </div>
                    `;
                    return;
                }

                const filteredData = historyDataArr.filter(item => {
                    if (!historySearchQuery) return true;
                    return (item.data.requestId && item.data.requestId.toLowerCase().includes(historySearchQuery)) ||
                           (item.data.requester && item.data.requester.toLowerCase().includes(historySearchQuery)) ||
                           (item.data.newNick && item.data.newNick.toLowerCase().includes(historySearchQuery)) ||
                           (item.data.reason && item.data.reason.toLowerCase().includes(historySearchQuery));
                });

                if (filteredData.length === 0) {
                    historyPagination.classList.add('hidden');
                    historyGrid.innerHTML = `
                        <div class="col-span-full bg-white/70 border border-dashed border-brand-borderGray rounded-[24px] p-8 text-center max-w-md mx-auto mt-4">
                            <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-brand-surface flex items-center justify-center text-brand-navy">
                                <i class="ph-bold ph-magnifying-glass text-2xl"></i>
                            </div>
                            <h4 class="text-sm font-black uppercase tracking-[0.2em] text-brand-navy mb-2">Sem resultados</h4>
                            <p class="text-[11px] text-brand-textGray">Nenhum registro atende à sua pesquisa.</p>
                        </div>
                    `;
                    return;
                }

                const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
                if (historyCurrentPage > totalPages) historyCurrentPage = totalPages;
                if (historyCurrentPage < 1) historyCurrentPage = 1;

                const startIdx = (historyCurrentPage - 1) * ITEMS_PER_PAGE;
                const endIdx = startIdx + ITEMS_PER_PAGE;
                const pageItems = filteredData.slice(startIdx, endIdx);

                pageItems.forEach(item => {
                    historyGrid.appendChild(createHistoryCard(item.data, item.status));
                });

                historyPagination.classList.remove('hidden');
                historyPageInfo.textContent = `Página ${historyCurrentPage} de ${totalPages}`;
                historyPrevBtn.disabled = historyCurrentPage === 1;
                historyNextBtn.disabled = historyCurrentPage === totalPages;
            }

            function renderAllTransfersList() {
                allTransfersList.innerHTML = '';

                if (allTransfersDataArr.length === 0) {
                    allPagination.classList.add('hidden');
                    allTransfersList.innerHTML = `
                        <div class="w-full bg-white/70 border border-dashed border-brand-borderGray rounded-[24px] p-8 text-center max-w-md mx-auto mt-4">
                            <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-brand-surface flex items-center justify-center text-brand-navy">
                                <img src="https://i.imgur.com/oqWtapx.png" alt="Vazio" class="w-8 h-8 object-contain">
                            </div>
                            <h4 class="text-sm font-black uppercase tracking-[0.2em] text-brand-navy mb-2">Lista Vazia</h4>
                            <p class="text-[11px] text-brand-textGray">Ainda não há nenhuma transferência cadastrada no sistema.</p>
                        </div>
                    `;
                    return;
                }

                const filteredData = getFilteredAllTransfers();

                if (filteredData.length === 0) {
                    allPagination.classList.add('hidden');
                    allTransfersList.innerHTML = `
                        <div class="w-full bg-white/70 border border-dashed border-brand-borderGray rounded-[24px] p-8 text-center max-w-md mx-auto mt-4">
                            <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-brand-surface flex items-center justify-center text-brand-navy">
                                <i class="ph-bold ph-magnifying-glass text-2xl"></i>
                            </div>
                            <h4 class="text-sm font-black uppercase tracking-[0.2em] text-brand-navy mb-2">Sem resultados</h4>
                            <p class="text-[11px] text-brand-textGray">Nenhum registro atende à sua pesquisa.</p>
                        </div>
                    `;
                    return;
                }

                const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE_ALL);
                if (allTransfersCurrentPage > totalPages) allTransfersCurrentPage = totalPages;
                if (allTransfersCurrentPage < 1) allTransfersCurrentPage = 1;

                const startIdx = (allTransfersCurrentPage - 1) * ITEMS_PER_PAGE_ALL;
                const endIdx = startIdx + ITEMS_PER_PAGE_ALL;
                const pageItems = filteredData.slice(startIdx, endIdx);

                pageItems.forEach(req => {
                    allTransfersList.appendChild(buildMinimalTransferUI(req));
                });

                allPagination.classList.remove('hidden');
                allPageInfo.textContent = `Página ${allTransfersCurrentPage} de ${totalPages}`;
                allPrevBtn.disabled = allTransfersCurrentPage === 1;
                allNextBtn.disabled = allTransfersCurrentPage === totalPages;
            }

            requestsPrevBtn.addEventListener('click', () => { requestsCurrentPage--; renderRequestsGrid(); });
            requestsNextBtn.addEventListener('click', () => { requestsCurrentPage++; renderRequestsGrid(); });
            historyPrevBtn.addEventListener('click', () => { historyCurrentPage--; renderHistoryGrid(); });
            historyNextBtn.addEventListener('click', () => { historyCurrentPage++; renderHistoryGrid(); });
            allPrevBtn.addEventListener('click', () => { allTransfersCurrentPage--; renderAllTransfersList(); });
            allNextBtn.addEventListener('click', () => { allTransfersCurrentPage++; renderAllTransfersList(); });

            const exportPdfBtn = document.getElementById('exportPdfBtn');
            const exportExcelBtn = document.getElementById('exportExcelBtn');

            if (exportPdfBtn) {
                exportPdfBtn.addEventListener('click', () => {
                    const data = getFilteredAllTransfers();
                    if (data.length === 0) return alert("Nenhum dado para exportar.");
                    
                    const originalIcon = exportPdfBtn.innerHTML;
                    exportPdfBtn.innerHTML = '<i class="ph-bold ph-spinner animate-spin text-lg"></i>';
                    exportPdfBtn.disabled = true;

                    const pdfWrapper = document.createElement('div');
                    pdfWrapper.style.padding = '30px';
                    pdfWrapper.style.fontFamily = "'Poppins', sans-serif";
                    pdfWrapper.style.color = '#132a46';
                    
                    let htmlStr = `
                        <div style="text-align: center; margin-bottom: 30px;">
                            <img src="https://i.imgur.com/7NkvjPi.png" style="width: 70px; height: auto; margin-bottom: 15px;" crossorigin="anonymous">
                            <h1 style="font-size: 22px; font-weight: 900; text-transform: uppercase; margin: 0; color: #132a46;">Polícia Militar Revolução Contra o Crime</h1>
                            <h2 style="font-size: 16px; font-weight: 700; color: #83909e; margin: 5px 0;">Administradores do Fórum</h2>
                            <h3 style="font-size: 14px; font-weight: 600; color: #f68b28; margin: 0;">Transferências de Conta</h3>
                        </div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
                            <thead>
                                <tr style="background-color: #132a46; color: white;">
                                    <th style="padding: 10px; border: 1px solid #b8c3cd;">Código</th>
                                    <th style="padding: 10px; border: 1px solid #b8c3cd;">Data</th>
                                    <th style="padding: 10px; border: 1px solid #b8c3cd;">Solicitante</th>
                                    <th style="padding: 10px; border: 1px solid #b8c3cd;">Novo Nick</th>
                                    <th style="padding: 10px; border: 1px solid #b8c3cd;">Oficial Resp.</th>
                                    <th style="padding: 10px; border: 1px solid #b8c3cd;">Motivo</th>
                                    <th style="padding: 10px; border: 1px solid #b8c3cd;">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    data.forEach(req => {
                        htmlStr += `
                            <tr style="page-break-inside: avoid;">
                                <td style="padding: 10px; border: 1px solid #b8c3cd;">${escapeHTML(req.codigo)}</td>
                                <td style="padding: 10px; border: 1px solid #b8c3cd;">${escapeHTML(formatBrasiliaDate(req.dataHora))}</td>
                                <td style="padding: 10px; border: 1px solid #b8c3cd;">${escapeHTML(req.solicitante)}${req.postadoPor ? ` (por ${escapeHTML(req.postadoPor)})` : ''}</td>
                                <td style="padding: 10px; border: 1px solid #b8c3cd;">${escapeHTML(req.novoNick)}</td>
                                <td style="padding: 10px; border: 1px solid #b8c3cd;">${escapeHTML(req.oficial)}</td>
                                <td style="padding: 10px; border: 1px solid #b8c3cd;">${escapeHTML(req.motivo.split(' - ')[0])}</td>
                                <td style="padding: 10px; border: 1px solid #b8c3cd; font-weight: bold;">${escapeHTML(req.status)}</td>
                            </tr>
                        `;
                    });

                    htmlStr += "</tbody></table>";
                    pdfWrapper.innerHTML = htmlStr;

                    const opt = {
                        margin:       10,
                        filename:     'Transferencias_RCC.pdf',
                        image:        { type: 'jpeg', quality: 0.98 },
                        html2canvas:  { scale: 2, useCORS: true },
                        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' },
                        pagebreak:    { mode: ['css', 'legacy'] }
                    };

                    html2pdf().set(opt).from(pdfWrapper).save().then(() => {
                        exportPdfBtn.innerHTML = originalIcon;
                        exportPdfBtn.disabled = false;
                    }).catch(err => {
                        console.error(err);
                        exportPdfBtn.innerHTML = originalIcon;
                        exportPdfBtn.disabled = false;
                    });
                });
            }

            if (exportExcelBtn) {
                exportExcelBtn.addEventListener('click', () => {
                    const data = getFilteredAllTransfers();
                    if (data.length === 0) return alert("Nenhum dado para exportar.");
                    
                    const originalIcon = exportExcelBtn.innerHTML;
                    exportExcelBtn.innerHTML = '<i class="ph-bold ph-spinner animate-spin text-lg"></i>';
                    exportExcelBtn.disabled = true;

                    setTimeout(() => {
                        try {
                            const ws_data = data.map(req => ({
                                "Código": req.codigo,
                                "Data da Solicitação": formatBrasiliaDate(req.dataHora),
                                "Solicitante": req.solicitante,
                                "Postado Por": req.postadoPor || '',
                                "Novo Nickname": req.novoNick,
                                "Oficial Responsável": req.oficial,
                                "Motivo": req.motivo,
                                "Comprovações": req.comprovacoes,
                                "Status": req.status,
                                "Avaliação/Registro": req.comentario || '',
                                "Data da Decisão": req.dataHoraDecisao ? formatBrasiliaDate(req.dataHoraDecisao) : ''
                            }));
                            
                            const ws = XLSX.utils.json_to_sheet(ws_data);
                            const wb = XLSX.utils.book_new();
                            XLSX.utils.book_append_sheet(wb, ws, "Transferências");
                            XLSX.writeFile(wb, "Transferencias_RCC.xlsx");
                        } catch(e) {
                            console.error("Erro ao gerar Excel", e);
                        } finally {
                            exportExcelBtn.innerHTML = originalIcon;
                            exportExcelBtn.disabled = false;
                        }
                    }, 100);
                });
            }

            function setRccActionState(card, done) {
                const button = card.querySelector('.history-rcc-btn');
                if (!button) return;

                button.className = done
                    ? 'history-rcc-btn w-10 h-10 rounded-full border border-brand-green/30 bg-brand-green/10 text-brand-green flex items-center justify-center transition-all shrink-0'
                    : 'history-rcc-btn w-10 h-10 rounded-full border border-brand-borderGray/30 bg-brand-surface/50 text-brand-navy flex items-center justify-center transition-all hover:bg-brand-green/10 hover:text-brand-green hover:border-brand-green/30 shrink-0';
                
                card.dataset.rccStatus = done ? 'done' : 'pending';
            }

            function setGtActionState(card, mainCompany = '', subCompanies = []) {
                const button = card.querySelector('.history-gt-toggle');
                if (!button) return;

                const done = Boolean(mainCompany);

                button.className = done
                    ? 'history-gt-toggle w-10 h-10 rounded-full border border-brand-navy/30 bg-brand-navy/10 text-brand-navy flex items-center justify-center transition-all shrink-0'
                    : 'history-gt-toggle w-10 h-10 rounded-full border border-brand-borderGray/30 bg-brand-surface/50 text-brand-navy flex items-center justify-center transition-all hover:bg-brand-navy/10 hover:border-brand-navy/30 shrink-0';
                
                card.dataset.gtStatus = done ? 'done' : 'pending';
                card.dataset.gtMainCompany = mainCompany;
                card.dataset.gtSubCompanies = JSON.stringify(subCompanies.map(s => s.name));
            }

            function buildQueueRequestUI(requestData) {
                const div = document.createElement('div');
                div.className = 'request-card bg-white rounded-[18px] border border-brand-borderGray/25 p-4 flex flex-col justify-between';
                div.dataset.requestId = requestData.codigo;
                div.dataset.requester = requestData.solicitante;
                div.dataset.date = requestData.dataHora;
                
                div.innerHTML = `
                    <div class="w-full mb-3">
                        <div class="flex items-start justify-between gap-3 pb-3 border-b border-brand-borderGray/20">
                            <div>
                                <span class="text-[9px] font-black uppercase tracking-[0.18em] text-brand-textGray">Solicitação pendente</span>
                                <h4 class="font-black text-lg text-brand-navy mt-1">${escapeHTML(requestData.codigo)}</h4>
                            </div>
                            <span class="bg-brand-badgeGray/10 text-brand-badgeGray text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-[0.18em]">Pendente</span>
                        </div>
                        <div class="grid grid-cols-2 gap-2 mt-3">
                            <div class="rounded-[12px] border border-brand-borderGray/20 px-3 py-2">
                                <span class="text-[9px] font-black uppercase tracking-[0.18em] text-brand-textGray">Solicitante</span>
                                <div class="mt-1 flex flex-col">
                                    <span class="text-[12px] font-bold text-brand-navy">${escapeHTML(requestData.solicitante)}</span>
                                    ${requestData.postadoPor ? `<span class="text-[9px] font-bold text-brand-orange mt-0.5" title="Postado por terceiro">por ${escapeHTML(requestData.postadoPor)}</span>` : ''}
                                </div>
                            </div>
                            <div class="rounded-[12px] border border-brand-borderGray/20 px-3 py-2">
                                <span class="text-[9px] font-black uppercase tracking-[0.18em] text-brand-textGray">Data</span>
                                <p class="text-[11px] font-bold text-brand-navy mt-1 leading-tight break-words">${escapeHTML(formatBrasiliaDate(requestData.dataHora))}</p>
                            </div>
                            <div class="rounded-[12px] border border-brand-borderGray/20 px-3 py-2">
                                <span class="text-[9px] font-black uppercase tracking-[0.18em] text-brand-textGray">Motivo</span>
                                <p class="text-[12px] font-bold text-brand-navy mt-1 request-reason break-words leading-tight">${escapeHTML(requestData.motivo.split(' - ')[0])}</p>
                            </div>
                            <div class="rounded-[12px] border border-brand-borderGray/20 px-3 py-2">
                                <span class="text-[9px] font-black uppercase tracking-[0.18em] text-brand-textGray">Novo Nick</span>
                                <p class="text-[12px] font-bold text-brand-navy mt-1 request-new-nick">${escapeHTML(requestData.novoNick)}</p>
                            </div>
                        </div>
                        <div class="mt-3 rounded-[14px] border border-brand-borderGray/20 px-3 py-2.5">
                            <p class="text-[8px] font-black uppercase tracking-[0.16em] text-brand-textGray">Comprovações</p>
                            ${requestData.comprovacoes !== 'Nenhuma (opcional)' ? 
                                `<a href="${escapeHTML(requestData.comprovacoes)}" target="_blank" class="text-[11px] text-brand-orange hover:underline mt-1 font-semibold truncate block">${escapeHTML(requestData.comprovacoes)}</a>` : 
                                `<p class="text-[11px] text-brand-textGray mt-1 font-semibold">Nenhuma enviada</p>`}
                        </div>
                    </div>
                    <div class="mt-auto grid grid-cols-2 gap-2 shrink-0">
                        <button type="button" class="approve-request bg-brand-green/10 hover:bg-brand-green/15 text-brand-green py-2.5 rounded-[14px] transition-all flex items-center justify-center gap-2 group border border-brand-green/20">
                            <i class="ph-bold ph-check text-[15px] group-hover:scale-110 transition-transform"></i>
                            <span class="text-[9px] font-black uppercase tracking-[0.16em] leading-none">Aprovar</span>
                        </button>
                        <button type="button" class="reject-request bg-red-500/10 hover:bg-red-500/15 text-red-500 py-2.5 rounded-[14px] transition-all flex items-center justify-center gap-2 group border border-red-500/20">
                            <i class="ph-bold ph-x text-[15px] group-hover:scale-110 transition-transform"></i>
                            <span class="text-[9px] font-black uppercase tracking-[0.16em] leading-none">Recusar</span>
                        </button>
                    </div>
                `;
                return div;
            }

            function buildMinimalTransferUI(req) {
                let statusClass = "bg-brand-badgeGray/10 text-brand-badgeGray border-brand-borderGray/30";
                if (req.status === "Aprovado") statusClass = "bg-brand-green/10 text-brand-green border-brand-green/20";
                if (req.status === "Recusado") statusClass = "bg-red-500/10 text-red-500 border-red-500/20";

                const div = document.createElement('div');
                div.className = "bg-white rounded-[16px] border border-brand-borderGray/30 p-5 hover:border-brand-navy/30 transition-all flex flex-col gap-4";
                
                const decisionText = req.status === 'Aprovado' ? 'Aprovação confirmada.' : (req.comentario || 'Sem comentário.');
                const decisionDate = req.dataHoraDecisao ? `(${escapeHTML(formatBrasiliaDate(req.dataHoraDecisao))})` : '';

                const provasHtml = req.comprovacoes && req.comprovacoes !== 'Nenhuma (opcional)' 
                    ? `<a href="${escapeHTML(req.comprovacoes)}" target="_blank" class="block text-[11px] font-bold text-brand-orange truncate hover:underline" title="${escapeHTML(req.comprovacoes)}">Ver provas</a>`
                    : `<span class="block text-[11px] font-bold text-brand-textGray truncate">Nenhuma</span>`;

                div.innerHTML = `
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-borderGray/20 pb-3">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-brand-surface flex items-center justify-center shrink-0">
                                <i class="ph-bold ph-hash text-brand-navy text-[14px]"></i>
                            </div>
                            <div>
                                <h4 class="text-[13px] font-black text-brand-navy uppercase tracking-widest leading-none">${escapeHTML(req.codigo)}</h4>
                                <span class="text-[9px] text-brand-textGray font-semibold">${escapeHTML(formatBrasiliaDate(req.dataHora))}</span>
                            </div>
                        </div>
                        <span class="border ${statusClass} text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto">${escapeHTML(req.status)}</span>
                    </div>
                    
                    <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                            <span class="block text-[8px] font-black uppercase tracking-[0.16em] text-brand-textGray mb-0.5">Solicitante</span>
                            <span class="block text-[11px] font-bold text-brand-navy truncate" title="${escapeHTML(req.solicitante)}">${escapeHTML(req.solicitante)}</span>
                            ${req.postadoPor ? `<span class="block text-[9px] font-bold text-brand-orange mt-0.5" title="Postado por terceiro">por ${escapeHTML(req.postadoPor)}</span>` : ''}
                        </div>
                        <div>
                            <span class="block text-[8px] font-black uppercase tracking-[0.16em] text-brand-textGray mb-0.5">Novo Nick</span>
                            <span class="block text-[11px] font-bold text-brand-orange truncate" title="${escapeHTML(req.novoNick)}">${escapeHTML(req.novoNick)}</span>
                        </div>
                        <div>
                            <span class="block text-[8px] font-black uppercase tracking-[0.16em] text-brand-textGray mb-0.5">Oficial Resp.</span>
                            <span class="block text-[11px] font-bold text-brand-navy truncate" title="${escapeHTML(req.oficial)}">${escapeHTML(req.oficial)}</span>
                        </div>
                        <div>
                            <span class="block text-[8px] font-black uppercase tracking-[0.16em] text-brand-textGray mb-0.5">Comprovações</span>
                            ${provasHtml}
                        </div>
                        <div>
                            <span class="block text-[8px] font-black uppercase tracking-[0.16em] text-brand-textGray mb-0.5">Motivo</span>
                            <span class="block text-[11px] font-bold text-brand-navy truncate" title="${escapeHTML(req.motivo)}">${escapeHTML(req.motivo.split(' - ')[0])}</span>
                        </div>
                    </div>

                    ${req.status !== 'Pendente' ? `
                    <div class="mt-1 bg-brand-surface/40 rounded-[12px] p-3 flex items-start gap-2.5">
                        <i class="ph-fill ph-info text-brand-textGray text-sm shrink-0 mt-0.5"></i>
                        <p class="text-[10px] text-brand-navy leading-relaxed font-medium">
                            <span class="text-brand-textGray font-bold uppercase tracking-widest text-[8px] mr-1">Avaliação:</span>
                            ${escapeHTML(decisionText)} 
                            <span class="text-brand-textGray opacity-70 ml-1 font-normal">${decisionDate}</span>
                        </p>
                    </div>
                    ` : ''}
                `;
                return div;
            }

            async function loadSolicitacoesFromMacro(isSilent = false) {
                if (!MACRO_URL) return;
                try {
                    if (!isSilent) {
                        requestsQueue.innerHTML = '<p class="text-[12px] text-brand-textGray italic p-4 text-center w-full col-span-full">Carregando solicitações pendentes do banco de dados...</p>';
                        requestsPagination.classList.add('hidden');
                    }
                    
                    const response = await fetch(`${MACRO_URL}?type=pendentes`);
                    const json = await response.json();

                    if (json.status === "success" && json.data) {
                        requestsDataArr = json.data.filter(req => req.oficial === LOGGED_IN_USER);
                        requestsCurrentPage = 1;
                        renderRequestsGrid();
                    } else {
                        requestsDataArr = [];
                        renderRequestsGrid();
                    }
                } catch (error) {
                    console.error("Erro ao carregar dados da planilha:", error);
                    if (!isSilent) {
                        requestsQueue.innerHTML = '<p class="text-[12px] text-red-500 font-bold p-4 text-center w-full col-span-full">Erro ao conectar com a planilha. Verifique a URL do Web App.</p>';
                    }
                }
            }

            async function loadHistoryFromMacro() {
                if (!MACRO_URL) return;
                try {
                    historyGrid.innerHTML = '<p class="text-[12px] text-brand-textGray italic p-4 text-center w-full col-span-full">Carregando seu histórico da base de dados...</p>';
                    historyPagination.classList.add('hidden');

                    const response = await fetch(`${MACRO_URL}?type=history&user=${encodeURIComponent(LOGGED_IN_USER)}`);
                    const json = await response.json();

                    if (json.status === "success" && json.data && json.data.length > 0) {
                        historyDataArr = [];
                        json.data.forEach(req => {
                            const requestData = {
                                requestId: req.codigo,
                                requester: req.solicitante,
                                date: req.dataHora,
                                reason: req.motivo,
                                newNick: req.novoNick,
                                comprovacoes: req.comprovacoes,
                                postadoPor: req.postadoPor || '',
                                decisionNote: req.comentario || ''
                            };
                            let mappedStatus = 'pending';
                            if (req.status === 'Aprovado') mappedStatus = 'approved';
                            if (req.status === 'Recusado') mappedStatus = 'rejected';
                            
                            historyDataArr.push({ data: requestData, status: mappedStatus });
                        });
                        historyCurrentPage = 1;
                        renderHistoryGrid();
                    } else {
                        historyDataArr = [];
                        renderHistoryGrid();
                    }
                } catch (error) {
                    console.error("Erro ao carregar histórico:", error);
                    historyGrid.innerHTML = '<p class="text-[12px] text-red-500 font-bold p-4 text-center w-full col-span-full">Erro ao carregar seu histórico. Verifique a URL do Web App.</p>';
                }
            }

            async function loadAllTransfersFromMacro() {
                if (!MACRO_URL) return;
                try {
                    allTransfersList.innerHTML = '<p class="text-[12px] text-brand-textGray italic p-4 text-center w-full">Carregando dados globais da planilha...</p>';
                    allPagination.classList.add('hidden');

                    const response = await fetch(`${MACRO_URL}?type=all`);
                    const json = await response.json();

                    if (json.status === "success" && json.data && json.data.length > 0) {
                        allTransfersDataArr = json.data;
                        allTransfersCurrentPage = 1;
                        renderAllTransfersList();
                    } else {
                        allTransfersDataArr = [];
                        renderAllTransfersList();
                    }
                } catch (error) {
                    console.error("Erro ao carregar dados globais:", error);
                    allTransfersList.innerHTML = '<p class="text-[12px] text-red-500 font-bold p-4 text-center w-full">Erro ao carregar a lista geral. Verifique a URL do Web App.</p>';
                }
            }


            function createHistoryCard(requestData, status) {
                const isApproved = status === 'approved';
                const isRejected = status === 'rejected';
                const isPending = status === 'pending';
                
                let decisionNote = requestData.decisionNote;
                if (!decisionNote) {
                    if (isApproved) decisionNote = 'Aprovação confirmada pela administração.';
                    else if (isRejected) decisionNote = 'Pedido encerrado após análise.';
                    else decisionNote = 'Aguardando revisão do oficial responsável.';
                }

                let statusClass = "bg-brand-badgeGray/10 text-brand-badgeGray border-brand-borderGray/30";
                if (isApproved) statusClass = "bg-brand-green/10 text-brand-green border-brand-green/20";
                if (isRejected) statusClass = "bg-red-500/10 text-red-500 border-red-500/20";
                
                const badgeText = isApproved ? 'Aprovado' : (isRejected ? 'Recusado' : 'Pendente');

                const card = document.createElement('div');
                card.className = `history-card bg-white rounded-[16px] border border-brand-borderGray/30 p-5 hover:border-brand-navy/30 transition-all flex flex-col gap-4`;
                card.dataset.requestId = requestData.requestId;
                
                let actionsHTML = '';
                if (isApproved) {
                    actionsHTML = `
                        <div class="flex items-center gap-2 mt-2 pt-3 border-t border-brand-borderGray/20">
                            <span class="text-[9px] font-black uppercase tracking-[0.16em] text-brand-textGray mr-2">Ações:</span>
                            <button type="button" title="Sincronizar no RCCSystem" class="history-rcc-btn w-9 h-9 rounded-full border border-brand-borderGray/30 bg-brand-surface/50 text-brand-navy flex items-center justify-center transition-all hover:bg-brand-green/10 hover:text-brand-green hover:border-brand-green/30 shrink-0">
                                <i class="ph-bold ph-desktop text-[16px]"></i>
                            </button>
                            <div class="history-gt-wrap relative">
                                <button type="button" title="Grupos de Tarefas" class="history-gt-toggle w-9 h-9 rounded-full border border-brand-borderGray/30 bg-brand-surface/50 text-brand-navy flex items-center justify-center transition-all hover:bg-brand-navy/10 hover:border-brand-navy/30 shrink-0">
                                    <i class="ph-bold ph-briefcase text-[16px]"></i>
                                </button>
                                <div class="history-gt-panel hidden absolute top-full left-0 mt-2 w-64 rounded-[14px] border border-brand-borderGray/20 bg-white p-3 shadow-xl z-20">
                                    <div class="space-y-3">
                                        <div>
                                            <label class="text-[9px] font-bold text-brand-textGray uppercase block mb-1">Companhia Principal</label>
                                            <select class="history-gt-main w-full bg-brand-surface/50 border-none text-[10px] font-bold rounded-lg p-2 outline-none cursor-pointer">
                                                ${getCompanyOptionsMarkup()}
                                            </select>
                                        </div>
                                        <div>
                                            <label class="text-[9px] font-bold text-brand-textGray uppercase block mb-1">Subcompanhias</label>
                                            <div class="max-h-32 overflow-y-auto pr-2 space-y-1.5 panel-scrollbar">
                                                ${getSubCompanyOptionsMarkup()}
                                            </div>
                                        </div>
                                        <button type="button" class="history-gt-confirm w-full border border-brand-green/20 bg-brand-green/10 text-brand-green text-[10px] font-bold py-2 rounded-[12px] uppercase tracking-widest hover:bg-brand-green/15 transition-colors">Confirmar Envio</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }

                const provasHtml = requestData.comprovacoes && requestData.comprovacoes !== 'Nenhuma (opcional)' 
                    ? `<a href="${escapeHTML(requestData.comprovacoes)}" target="_blank" class="block text-[11px] font-bold text-brand-orange truncate hover:underline" title="${escapeHTML(requestData.comprovacoes)}">Ver provas</a>`
                    : `<span class="block text-[11px] font-bold text-brand-textGray truncate">Nenhuma</span>`;

                card.innerHTML = `
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-borderGray/20 pb-3">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-brand-surface flex items-center justify-center shrink-0">
                                <i class="ph-bold ph-hash text-brand-navy text-[14px]"></i>
                            </div>
                            <div>
                                <h4 class="text-[13px] font-black text-brand-navy uppercase tracking-widest leading-none">${escapeHTML(requestData.requestId)}</h4>
                                <span class="text-[9px] text-brand-textGray font-semibold">${escapeHTML(formatBrasiliaDate(requestData.date))}</span>
                            </div>
                        </div>
                        <span class="border ${statusClass} text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto">${badgeText}</span>
                    </div>
                    
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <span class="block text-[8px] font-black uppercase tracking-[0.16em] text-brand-textGray mb-0.5">Solicitante</span>
                            <span class="block text-[11px] font-bold text-brand-navy truncate" title="${escapeHTML(requestData.requester)}">${escapeHTML(requestData.requester)}</span>
                            ${requestData.postadoPor ? `<span class="block text-[9px] font-bold text-brand-orange mt-0.5" title="Postado por terceiro">por ${escapeHTML(requestData.postadoPor)}</span>` : ''}
                        </div>
                        <div>
                            <span class="block text-[8px] font-black uppercase tracking-[0.16em] text-brand-textGray mb-0.5">Novo Nick</span>
                            <span class="block text-[11px] font-bold text-brand-orange truncate request-new-nick" title="${escapeHTML(requestData.newNick)}">${escapeHTML(requestData.newNick)}</span>
                        </div>
                        <div>
                            <span class="block text-[8px] font-black uppercase tracking-[0.16em] text-brand-textGray mb-0.5">Comprovações</span>
                            ${provasHtml}
                        </div>
                        <div>
                            <span class="block text-[8px] font-black uppercase tracking-[0.16em] text-brand-textGray mb-0.5">Motivo</span>
                            <span class="block text-[11px] font-bold text-brand-navy truncate request-reason" title="${escapeHTML(requestData.reason)}">${escapeHTML(requestData.reason.split(' - ')[0])}</span>
                        </div>
                    </div>

                    ${!isPending ? `
                    <div class="mt-1 bg-brand-surface/40 rounded-[12px] p-3 flex items-start gap-2.5">
                        <i class="ph-fill ph-info text-brand-textGray text-sm shrink-0 mt-0.5"></i>
                        <p class="text-[10px] text-brand-navy leading-relaxed font-medium">
                            <span class="text-brand-textGray font-bold uppercase tracking-widest text-[8px] mr-1">Avaliação:</span>
                            ${escapeHTML(decisionNote)}
                        </p>
                    </div>
                    ` : ''}

                    ${actionsHTML}
                `;

                if (isApproved) {
                    card.dataset.rccStatus = 'pending';
                    card.dataset.gtStatus = 'pending';
                    card.dataset.gtMainCompany = '';
                    card.dataset.gtSubCompanies = '[]';
                }

                return card;
            }

            function collectRequestData(card) {
                return {
                    requestId: card.dataset.requestId || 'Sem ID',
                    requester: card.dataset.requester || 'Não informado',
                    date: card.dataset.date || 'Sem data',
                    reason: card.querySelector('.request-reason')?.textContent.trim() || 'Não informado',
                    newNick: card.querySelector('.request-new-nick')?.textContent.trim() || 'Não informado'
                };
            }

            requestsQueue.addEventListener('click', (event) => {
                const approveBtn = event.target.closest('.approve-request');
                const rejectBtn = event.target.closest('.reject-request');
                
                if (approveBtn) {
                    const requestCard = approveBtn.closest('.request-card');
                    openDecisionModal('approved', requestCard);
                } else if (rejectBtn) {
                    const requestCard = rejectBtn.closest('.request-card');
                    openDecisionModal('rejected', requestCard);
                }
            });

            historyGrid.addEventListener('click', (event) => {
                const panel = event.target.closest('.history-gt-panel');
                if (panel) event.stopPropagation();

                const gtConfirm = event.target.closest('.history-gt-confirm');
                if (gtConfirm) {
                    event.stopPropagation();
                    const historyCard = gtConfirm.closest('.history-card');
                    const gtPanel = gtConfirm.closest('.history-gt-panel');
                    
                    // Capta a companhia selecionada e o Topic ID dela
                    const mainSelect = gtPanel.querySelector('.history-gt-main');
                    const mainCompany = mainSelect.value.trim();
                    const mainCompanyTopicId = mainSelect.options[mainSelect.selectedIndex].getAttribute('data-topic-id');

                    // Capta as subcompanhias e os respectivos Topic IDs
                    const subCompanies = Array.from(gtPanel.querySelectorAll('.history-sub-checkbox:checked')).map((checkbox) => {
                        return {
                            name: checkbox.nextElementSibling ? checkbox.nextElementSibling.textContent.trim() : '',
                            topicId: checkbox.getAttribute('data-topic-id')
                        }
                    }).filter(s => s.name);

                    // ==========================================
                    // NOTA: AQUI É ONDE VOCÊ PODE INSERIR A LÓGICA DE BBCODE DEPOIS. 
                    // Você tem o mainCompanyTopicId e subCompanies (que tem nome e topicId).
                    console.log('--- DADOS PARA O BBCODE (FÓRUM) ---');
                    console.log(`Companhia Principal: ${mainCompany} | ID Tópico: ${mainCompanyTopicId}`);
                    console.log('Subcompanhias selecionadas:', subCompanies);
                    // ==========================================

                    setGtActionState(historyCard, mainCompany, subCompanies);
                    gtPanel.classList.add('hidden');
                    return;
                }

                const gtToggle = event.target.closest('.history-gt-toggle');
                if (gtToggle) {
                    event.stopPropagation();
                    const gtPanel = gtToggle.nextElementSibling;
                    const isOpening = gtPanel.classList.contains('hidden');
                    closeHistoryPanels();
                    if (isOpening) gtPanel.classList.remove('hidden');
                    return;
                }

                const rccButton = event.target.closest('.history-rcc-btn');
                if (rccButton) {
                    event.stopPropagation();
                    const historyCard = rccButton.closest('.history-card');
                    
                    // Marca visualmente que já foi feito algo
                    setRccActionState(historyCard, true);
                    
                    // Abre a aba nova da página especificada
                    window.open("https://system.policercc.com.br/requerimentos/tags", "_blank");
                    
                    return;
                }
            });

            decisionForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const note = decisionNote.value.trim();
                
                if (!pendingDecisionContext) {
                    decisionError.textContent = 'Contexto inválido. Tente novamente.';
                    decisionError.classList.remove('hidden');
                    return;
                }

                const { action, requestCard } = pendingDecisionContext;
                if (action !== 'approved' && !note) {
                    decisionError.textContent = 'Preencha o campo de confirmação para continuar.';
                    decisionError.classList.remove('hidden');
                    return;
                }

                const originalHTML = decisionSubmit.innerHTML;
                decisionSubmit.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Processando...';
                decisionSubmit.disabled = true;

                const requestData = collectRequestData(requestCard);
                const codigoEnvio = requestData.requestId;

                const statusStr = action === 'approved' ? 'Aprovado' : 'Recusado';
                const comentarioStr = action === 'approved' ? '' : note;
                const dataHoraDecisaoStr = formatBrasiliaTimestamp(new Date());

                if (MACRO_URL) {
                    try {
                        await fetch(MACRO_URL, {
                            method: 'POST',
                            body: JSON.stringify({
                                action: 'updateStatus',
                                codigo: codigoEnvio,
                                status: statusStr,
                                comentario: comentarioStr,
                                dataHoraDecisao: dataHoraDecisaoStr
                            })
                        });
                    } catch (error) {
                        console.error("Erro ao atualizar o status na planilha:", error);
                    }
                }

                requestData.decisionNote = action === 'approved' ? (note || 'Aprovação confirmada.') : note;
                
                requestsDataArr = requestsDataArr.filter(req => req.codigo !== codigoEnvio);
                renderRequestsGrid();
                
                historyDataArr.unshift({
                    data: requestData,
                    status: action === 'approved' ? 'approved' : 'rejected'
                });
                historyCurrentPage = 1;
                renderHistoryGrid();
                
                decisionSubmit.innerHTML = originalHTML;
                decisionSubmit.disabled = false;

                closeDecisionModal();
            });

            transferForm.addEventListener('submit', async function(event) {
                event.preventDefault();
                thirdPartyNicknameInput.setCustomValidity('');
                oficialInput.setCustomValidity('');

                if (!this.reportValidity()) return;

                if (postagemTerceiroCheck.checked) {
                    if (!thirdPartyNicknameInput.value.trim()) {
                        thirdPartyNicknameInput.setCustomValidity('Informe o nickname de quem será transferido.');
                        thirdPartyNicknameInput.reportValidity();
                        return;
                    }
                } else if (!oficialHidden.value.trim()) {
                    oficialInput.setCustomValidity('Selecione o oficial responsável.');
                    oficialInput.reportValidity();
                    return;
                }

                const button = this.querySelector('button[type="submit"]');
                button.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Enviando...';
                button.disabled = true;

                const codigoAleatorio = generateUniqueCode();
                const motivoTexto = select.querySelector('.select-text').textContent;
                const novoNick = document.getElementById('novoNickInput').value.trim();
                const comprovacoes = document.getElementById('comprovacoesInput').value.trim() || 'Nenhuma (opcional)';
                
                // NOVO CÓDIGO DA LÓGICA DE POSTAGEM DE TERCEIRO:
                const solicitanteDestino = postagemTerceiroCheck.checked ? thirdPartyNicknameInput.value.trim() : LOGGED_IN_USER;
                const oficialDestino = postagemTerceiroCheck.checked ? LOGGED_IN_USER : oficialHidden.value;
                const postadoPorValor = postagemTerceiroCheck.checked ? LOGGED_IN_USER : '';
                const dataHoraAtual = formatBrasiliaDate(new Date());

                const requestPayload = {
                    action: 'create',
                    codigo: codigoAleatorio,
                    solicitante: solicitanteDestino,
                    dataHora: dataHoraAtual,
                    motivo: motivoTexto,
                    novoNick: novoNick,
                    comprovacoes: comprovacoes,
                    oficial: oficialDestino,
                    postadoPor: postadoPorValor
                };

                if (MACRO_URL) {
                    try {
                        await fetch(MACRO_URL, {
                            method: 'POST',
                            body: JSON.stringify(requestPayload)
                        });
                    } catch (error) {
                        console.error('Falha ao conectar com o macro:', error);
                    }
                } else {
                    console.warn("MACRO_URL vazia. Simulando inserção local apenas na UI.");
                }

                if (oficialDestino === LOGGED_IN_USER) {
                    requestsDataArr.unshift(requestPayload);
                    requestsCurrentPage = 1;
                    renderRequestsGrid();
                }

                historyDataArr.unshift({
                    data: {
                        requestId: codigoAleatorio,
                        requester: solicitanteDestino,
                        date: dataHoraAtual,
                        reason: motivoTexto,
                        newNick: novoNick,
                        comprovacoes: comprovacoes,
                        postadoPor: postadoPorValor,
                        decisionNote: ''
                    },
                    status: 'pending'
                });
                historyCurrentPage = 1;
                renderHistoryGrid();

                setTimeout(() => {
                    button.innerHTML = '<i class="ph-bold ph-check"></i> Enviado com Sucesso';
                    button.classList.replace('bg-brand-navy', 'bg-brand-green');

                    setTimeout(() => {
                        button.innerHTML = '<i class="ph-fill ph-paper-plane-right"></i> Solicitar';
                        button.classList.replace('bg-brand-green', 'bg-brand-navy');
                        button.disabled = false;
                        this.reset();
                        resetOficialPreview();
                        thirdPartyNicknameInput.setCustomValidity('');
                        oficialInput.setCustomValidity('');
                        select.querySelector('.select-text').textContent = 'SELECIONE UMA CAUSA';
                        select.querySelector('.select-text').classList.add('opacity-70');
                        syncThirdPartyMode();
                    }, 2000);
                }, MACRO_URL ? 500 : 1500);
            });

            closeDecisionModalButton.addEventListener('click', closeDecisionModal);
            openSolicitacoesGuideButton.addEventListener('click', openSolicitacoesGuide);
            closeSolicitacoesGuideButton.addEventListener('click', closeSolicitacoesGuide);
            solicitacoesGuideBackdrop.addEventListener('click', closeSolicitacoesGuide);

            decisionModal.addEventListener('click', (event) => {
                if (event.target === decisionModal || event.target === decisionModal.firstElementChild) {
                    closeDecisionModal();
                }
            });

            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    closeDecisionModal();
                    closeSolicitacoesGuide();
                    closeOficialDropdown();
                    closeHistoryPanels();
                }
            });

            document.addEventListener('click', () => {
                items.classList.add('hidden');
                icon.classList.remove('rotate-180');
                closeOficialDropdown();
                closeHistoryPanels();
            });

            showPage('page-transferir', 'nav-transferir');
        });
