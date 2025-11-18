document.addEventListener('DOMContentLoaded', () => {

    // --- SELETORES DO DOM ---
    const pedidoForm = document.getElementById('pedido-form');
    const caixasTbody = document.getElementById('caixas-tbody');
    const addModeloBtn = document.getElementById('add-modelo-btn');
    const novoPedidoBtn = document.getElementById('novo-pedido-btn');
    const gerarPdfBtn = document.getElementById('gerar-pdf-btn');
    const pedidosList = document.getElementById('pedidos-list');
    const searchPedidos = document.getElementById('search-pedidos');
    const toastMessage = document.getElementById('toast-message');
    const logoUpload = document.getElementById('logo-upload');
    const logoPreview = document.getElementById('logo-preview');
    const currentPedidoId = document.getElementById('current-pedido-id');

    // --- MODELOS PADRÃO ---
    const modelosFixos = [
        'Caixas Milk', 'Caixas Cone', 'Caixas Bala'
    ];

    // --- FUNÇÕES PRINCIPAIS ---

    /**
     * Carrega os modelos fixos na tabela.
     */
    function loadDefaultModels() {
        caixasTbody.innerHTML = ''; // Limpa tabela
        modelosFixos.forEach(modelo => {
            addCaixaRow(modelo, '', '', '', true);
        });
    }

   /**
     * Adiciona uma nova linha de modelo de caixa à tabela.
     * @param {string} modelo - Nome do modelo
     * @param {string} qtd - Quantidade
     * @param {string} impressao - Tipo de impressão
     * @param {string} camadas - Número de camadas
     * @param {boolean} isFixo - (Obsoleto para o botão, mantido para compatibilidade)
     */
    function addCaixaRow(modelo = '', qtd = '', impressao = '', camadas = '', isFixo = false) {
        const tr = document.createElement('tr');
        
        // Nota: Mesmo sendo fixo, agora geramos um input normal (readonly se quiser travar o nome) 
        // ou deixamos livre. Aqui mantive o comportamento de esconder o input se for fixo 
        // para manter o visual limpo, mas TODOS ganham o botão de excluir.
        
        const modeloHTML = isFixo 
            ? `<span class="modelo-fixo-nome">${modelo}</span><input type="hidden" class="modelo-caixa" value="${modelo}">`
            : `<input type="text" class="modelo-caixa" value="${modelo}" placeholder="Nome do Modelo" required>`;
        
        // AGORA: Todos os itens recebem o botão de excluir, sem verificação de isFixo
        const acaoHTML = `<td><button type="button" class="btn btn-delete-row" title="Remover este item">🗑️</button></td>`;

        tr.innerHTML = `
            <td>${modeloHTML}</td>
            <td><input type="number" class="qtd-caixa" value="${qtd}" min="0"></td>
            
            <td class="col-hidden">
                <input type="hidden" class="impressao-caixa" value="${impressao || ''}">
            </td>
            <td class="col-hidden">
                <input type="hidden" class="camadas-caixa" value="${camadas || ''}">
            </td>
            
            ${acaoHTML}
        `;

        // Adiciona o evento de click no botão de excluir para QUALQUER linha
        tr.querySelector('.btn-delete-row').addEventListener('click', () => {
            // Remove a linha da tabela
            tr.remove();
        });

        caixasTbody.appendChild(tr);
    }

    /**
     * Salva ou atualiza um pedido no localStorage.
     */
    function savePedido() {
        const id = currentPedidoId.value || `pedido_${Date.now()}`;
        
        const caixas = [];
        caixasTbody.querySelectorAll('tr').forEach(tr => {
            const modelo = tr.querySelector('.modelo-caixa').value;
            const qtd = tr.querySelector('.qtd-caixa').value;
            const impressao = tr.querySelector('.impressao-caixa').value;
            const camadas = tr.querySelector('.camadas-caixa').value;
            
            // Só salva se tiver um modelo e uma quantidade (ou só o modelo)
            if (modelo) {
                caixas.push({ modelo, qtd, impressao, camadas });
            }
        });

        // Não exige mais que tenha caixas para salvar
        // if (caixas.length === 0) {
        //     showToast('Adicione pelo menos uma caixa com quantidade.', 'error');
        //     return;
        // }

        const pedido = {
            id: id,
            cliente: document.getElementById('nome-cliente').value,
            crianca: document.getElementById('nome-crianca').value,
            dataEnvio: document.getElementById('data-envio').value,
            tema: document.getElementById('tema').value,
            tipoConta: document.getElementById('tipo-conta').value,
            dataSalvo: new Date().toISOString(),
            caixas: caixas
        };

        const pedidos = getPedidosFromStorage();
        const existingIndex = pedidos.findIndex(p => p.id === id);

        if (existingIndex > -1) {
            pedidos[existingIndex] = pedido; // Atualiza
        } else {
            pedidos.push(pedido); // Adiciona novo
        }

        localStorage.setItem('pedidosStudioNana', JSON.stringify(pedidos));
        showToast('✅ Pedido salvo com sucesso!');
        clearForm();
        loadPedidosList();
    }

    /**
     * Carrega a lista de pedidos salvos do localStorage.
     */
    function loadPedidosList() {
        const pedidos = getPedidosFromStorage();
        const filter = searchPedidos.value.toLowerCase();
        pedidosList.innerHTML = '';

        const pedidosFiltrados = pedidos
            .filter(p => p.cliente.toLowerCase().includes(filter))
            .sort((a, b) => new Date(b.dataSalvo) - new Date(a.dataSalvo)); // Mais recentes primeiro

        pedidosFiltrados.forEach(pedido => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="pedido-item-info">
                    <strong>${pedido.cliente}</strong>
                    <span>${new Date(pedido.dataSalvo).toLocaleDateString('pt-BR')}</span>
                </div>
                <div class="pedido-item-actions">
                    <button class="btn btn-action-sidebar btn-view-pdf" data-id="${pedido.id}">Ver PDF</button>
                    <button class="btn btn-action-sidebar btn-edit" data-id="${pedido.id}">Editar</button>
                    <button class="btn btn-action-sidebar btn-delete" data-id="${pedido.id}">Excluir</button>
                </div>
            `;
            pedidosList.appendChild(li);
        });
    }

    /**
     * Carrega um pedido existente no formulário para edição.
     * @param {string} id - ID do pedido
     */
    function loadPedidoForEdit(id) {
        const pedido = getPedidoById(id);
        if (!pedido) return;

        currentPedidoId.value = pedido.id;
        document.getElementById('nome-cliente').value = pedido.cliente;
        document.getElementById('nome-crianca').value = pedido.crianca;
        document.getElementById('data-envio').value = pedido.dataEnvio;
        document.getElementById('tema').value = pedido.tema;
        document.getElementById('tipo-conta').value = pedido.tipoConta;

        caixasTbody.innerHTML = ''; // Limpa tabela
        pedido.caixas.forEach(caixa => {
            const isFixo = modelosFixos.includes(caixa.modelo);
            addCaixaRow(caixa.modelo, caixa.qtd, caixa.impressao, caixa.camadas, isFixo);
        });
    }

    /**
     * Exclui um pedido do localStorage.
     * @param {string} id - ID do pedido
     */
    function deletePedido(id) {
        if (!confirm('Tem certeza que deseja excluir este pedido?')) {
            return;
        }

        let pedidos = getPedidosFromStorage();
        pedidos = pedidos.filter(p => p.id !== id);
        localStorage.setItem('pedidosStudioNana', JSON.stringify(pedidos));
        
        showToast('🗑️ Pedido excluído.', 'error');
        if (currentPedidoId.value === id) {
            clearForm();
        }
        loadPedidosList();
    }

    /**
     * Limpa o formulário para um novo pedido.
     */
    function clearForm() {
        pedidoForm.reset();
        currentPedidoId.value = '';
        loadDefaultModels();
    }

    /**
     * GERA O PDF USANDO jsPDF e jsPDF-AutoTable (NOVO MÉTODO)
     * @param {string|null} id - ID do pedido (opcional)
     */
    function generatePDF(id = null) {
        let pedido;

        if (id) {
            pedido = getPedidoById(id);
            if (!pedido) {
                showToast('Erro: Pedido não encontrado.', 'error');
                return;
            }
        } else {
            // Pega dados do formulário atual
            const clienteNome = document.getElementById('nome-cliente').value;
            if (!clienteNome) {
                showToast('Preencha o nome da cliente para gerar o PDF.', 'error');
                return;
            }
            
            const caixas = [];
            caixasTbody.querySelectorAll('tr').forEach(tr => {
                const modelo = tr.querySelector('.modelo-caixa').value;
                const qtd = tr.querySelector('.qtd-caixa').value;
                // Só inclui no PDF se tiver um modelo
                if (modelo) {
                    caixas.push({
                        modelo,
                        qtd: tr.querySelector('.qtd-caixa').value,
                        impressao: tr.querySelector('.impressao-caixa').value,
                        camadas: tr.querySelector('.camadas-caixa').value
                    });
                }
            });

            pedido = {
                cliente: clienteNome,
                crianca: document.getElementById('nome-crianca').value,
                dataEnvio: document.getElementById('data-envio').value,
                tema: document.getElementById('tema').value,
                tipoConta: document.getElementById('tipo-conta').value,
                caixas: caixas
            };
        }

        try {
            showToast('📄 Gerando PDF...', 'info');

            // 1. Inicializa o jsPDF
            // Usamos window.jspdf e window.jspdf.jsPDF porque as bibliotecas são carregadas globalmente
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF("p", "pt", "a4"); // Retrato, pontos, A4
            
            // Define a fonte padrão (helvetica é segura e suporta a maioria dos acentos)
            doc.setFont("helvetica", "normal");

            // 2. Define Posições e Estilos
            const margin = 40; // 40 pontos
            const pageWidth = doc.internal.pageSize.getWidth();
            const contentWidth = pageWidth - margin * 2;
            let cursorY = margin;
            const redColor = [229, 57, 53]; // Vermelho do seu modelo
            const tableHeaderColor = [77, 182, 172]; // Verde-água do seu modelo

            // 3. Cabeçalho (Logo e Info da Empresa)
            const logoDataUrl = localStorage.getItem('logoStudioNana');
            if (logoDataUrl) {
                try {
                    const img = new Image();
                    img.src = logoDataUrl;
                    // Tenta manter a proporção, com max-width de 120pt
                    const imgWidth = Math.min(80, img.width); 
                    const imgHeight = (img.height * imgWidth) / img.width;
                    doc.addImage(logoDataUrl, 'PNG', margin, cursorY, imgWidth, imgHeight);
                } catch (e) {
                    console.error("Erro ao adicionar a logo no PDF:", e);
                }
            }

            const companyInfoX = pageWidth - margin; // Alinhado à direita
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text("Studio Cantinho da Nana", companyInfoX, cursorY + 10, { align: 'right' });

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text("Rua Aristides Alves de Oliveira, 94", companyInfoX, cursorY + 25, { align: 'right' });
            doc.text("São Pedro da União MG 37855 - 000", companyInfoX, cursorY + 40, { align: 'right' });
            doc.text("WHATS: (35) 99903 - 2302", companyInfoX, cursorY + 55, { align: 'right' });

            cursorY += 80; // Move o cursor para baixo

            // 4. Linha Vermelha
            doc.setDrawColor(redColor[0], redColor[1], redColor[2]);
            doc.setLineWidth(1.5);
            doc.line(margin, cursorY, pageWidth - margin, cursorY);
            cursorY += 20;

            // 5. Título
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.text("Checklist de Pedido", margin, cursorY);
            cursorY += 25;

            // 6. Dados do Cliente
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            doc.text(`Nome da Cliente: ${pedido.cliente}`, margin, cursorY);
            cursorY += 15;
            doc.text(`Nome da Criança: ${pedido.crianca}`, margin, cursorY);
            cursorY += 15;
            const dataEnvioFormatada = pedido.dataEnvio 
                ? new Date(pedido.dataEnvio + 'T00:00:00').toLocaleDateString('pt-BR') 
                : '';
            doc.text(`Data de Envio: ${dataEnvioFormatada}`, margin, cursorY);
            cursorY += 15;
            doc.text(`Tema: ${pedido.tema}`, margin, cursorY);
            cursorY += 15;
            doc.text(`Tipo de Conta: ${pedido.tipoConta}`, margin, cursorY);
            cursorY += 25;

            // 7. Subtítulo "Caixas:"
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.text("Caixas:", margin, cursorY);
            cursorY += 15;
            
            // 8. Linha Vermelha (Igual à imagem)
            doc.setDrawColor(redColor[0], redColor[1], redColor[2]);
            doc.setLineWidth(1.5);
            doc.line(margin, cursorY - 8, pageWidth - margin, cursorY - 8);

            // 9. Tabela de Caixas
            const head = [['Modelo de Caixa', 'Quantidade', 'Impressão', 'Camadas']];
            const body = pedido.caixas.map(caixa => [
                caixa.modelo,
                caixa.qtd,
                caixa.impressao,
                caixa.camadas
            ]);

            doc.autoTable({
                head: head,
                body: body,
                startY: cursorY, // Começa de onde o cursor parou
                theme: 'grid', // Estilo 'grid' (com todas as linhas)
                headStyles: {
                    fillColor: tableHeaderColor, // Cor verde-água
                    textColor: [255, 255, 255], // Texto branco
                    fontStyle: 'bold'
                },
                styles: {
                    font: 'helvetica',
                    fontSize: 10,
                    cellPadding: 5
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245] // Linhas alternadas com cinza claro
                },
                margin: { left: margin, right: margin }
            });

            // 10. Salvar o PDF
            const nomeArquivo = `${pedido.cliente.replace(/ /g, '_') || 'pedido_sem_nome'}.pdf`;
            doc.save(nomeArquivo);

            showToast('✅ PDF gerado com sucesso!');

        } catch (error) {
            console.error("Erro ao gerar PDF com jsPDF:", error);
            showToast('❌ Erro ao gerar PDF. Verifique o console.', 'error');
        }
    }


    // --- FUNÇÕES AUXILIARES ---

    /**
     * Busca todos os pedidos do localStorage.
     * @returns {Array} Lista de pedidos
     */
    function getPedidosFromStorage() {
        return JSON.parse(localStorage.getItem('pedidosStudioNana')) || [];
    }

    /**
     * Busca um pedido específico por ID.
     * @param {string} id - ID do pedido
     * @returns {Object|null} O objeto do pedido
     */
    function getPedidoById(id) {
        const pedidos = getPedidosFromStorage();
        return pedidos.find(p => p.id === id) || null;
    }

    /**
     * Exibe uma mensagem de feedback (toast).
     * @param {string} message - Texto da mensagem
     * @param {string} type - 'success' (padrão) ou 'error'
     */
    function showToast(message, type = 'success') {
        toastMessage.textContent = message;
        toastMessage.className = type;
        toastMessage.classList.add('show');
        setTimeout(() => {
            toastMessage.classList.remove('show');
        }, 3000);
    }

    /**
     * Salva a logo carregada no localStorage como DataURL.
     */
    function handleLogoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            localStorage.setItem('logoStudioNana', dataUrl);
            logoPreview.src = dataUrl;
            logoPreview.style.display = 'block';
            showToast('Logo salva com sucesso!');
        };
        reader.readAsDataURL(file);
    }

    /**
     * Carrega a logo salva do localStorage ao iniciar.
     */
    function loadLogo() {
        const dataUrl = localStorage.getItem('logoStudioNana');
        if (dataUrl) {
            logoPreview.src = dataUrl;
            logoPreview.style.display = 'block';
        }
    }


    // --- EVENT LISTENERS ---

    // Salvar pedido (Submit do formulário)
    pedidoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        savePedido();
    });

    // Adicionar novo modelo
    addModeloBtn.addEventListener('click', () => {
        const nomeModelo = prompt('Digite o nome do novo modelo de caixa:');
        if (nomeModelo) {
            addCaixaRow(nomeModelo, '', '', '', false);
        }
    });

    // Limpar formulário
    novoPedidoBtn.addEventListener('click', clearForm);

    // Gerar PDF do formulário atual
    gerarPdfBtn.addEventListener('click', () => generatePDF(null));

    // Filtro de busca
    searchPedidos.addEventListener('input', loadPedidosList);

    // Ações na lista de pedidos salvos (delegação de eventos)
    pedidosList.addEventListener('click', (e) => {
        const target = e.target;
        const id = target.dataset.id;
        if (!id) return;

        if (target.classList.contains('btn-edit')) {
            loadPedidoForEdit(id);
            window.scrollTo(0, 0); // Rola para o topo
        } else if (target.classList.contains('btn-delete')) {
            deletePedido(id);
        } else if (target.classList.contains('btn-view-pdf')) {
            generatePDF(id);
        }
    });

    // Carregar logo
    logoUpload.addEventListener('change', handleLogoUpload);

    // --- INICIALIZAÇÃO ---
    loadDefaultModels();
    loadPedidosList();
    loadLogo();
});