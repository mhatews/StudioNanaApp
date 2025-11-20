document.addEventListener('DOMContentLoaded', () => {

    // --- SELETORES DO DOM ---
    const pedidoForm = document.getElementById('pedido-form');
    const caixasTbody = document.getElementById('caixas-tbody');
    const addModeloBtn = document.getElementById('add-modelo-btn');
    const novoPedidoBtn = document.getElementById('novo-pedido-btn');
    const gerarPdfBtn = document.getElementById('gerar-pdf-btn');
    const btnPdfTodos = document.getElementById('btn-pdf-todos'); // Botão PDF Geral
    
    // Seletor de Empresa
    const empresaSelect = document.getElementById('empresa-select');

    const pedidosList = document.getElementById('pedidos-list');
    const searchPedidos = document.getElementById('search-pedidos');
    const toastMessage = document.getElementById('toast-message');
    const logoUpload = document.getElementById('logo-upload');
    const logoPreview = document.getElementById('logo-preview');
    const currentPedidoId = document.getElementById('current-pedido-id');

    // --- MODELOS PADRÃO ---
    const modelosFixos = [
        'Milk', 'Cone', 'Bala',
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
     */
    function addCaixaRow(modelo = '', qtd = '', impressao = '', camadas = '', isFixo = false) {
        const tr = document.createElement('tr');
        
        const modeloHTML = isFixo 
            ? `<span class="modelo-fixo-nome">${modelo}</span><input type="hidden" class="modelo-caixa" value="${modelo}">`
            : `<input type="text" class="modelo-caixa" value="${modelo}" placeholder="Nome do Modelo" required>`;
        
        // Botão de remover para TODOS os itens
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

        // Evento de remover linha
        tr.querySelector('.btn-delete-row').addEventListener('click', () => {
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
            
            // Só salva se tiver um modelo definido
            if (modelo) {
                caixas.push({ modelo, qtd, impressao, camadas });
            }
        });

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
     * Limpa o formulário.
     */
    function clearForm() {
        pedidoForm.reset();
        currentPedidoId.value = '';
        loadDefaultModels();
    }

    /**
     * FUNÇÃO HELPER: Desenha UM pedido na página atual do PDF.
     * Responsável por todo o layout visual (Logo, Textos, Tabela).
     */
    function drawOrderOnPage(doc, pedido) {
        const margin = 40; 
        const pageWidth = doc.internal.pageSize.getWidth();
        let cursorY = margin;
        const redColor = [229, 57, 53];
        const tableHeaderColor = [77, 182, 172];

        // --- NOVO: Pega o nome da empresa selecionado no momento ---
        const empresaNome = document.getElementById('empresa-select').value;

        // 1. Logo
        const logoDataUrl = localStorage.getItem('logoStudioNana');
        if (logoDataUrl) {
            try {
                const img = new Image();
                img.src = logoDataUrl;
                // Tamanho máximo reduzido para 80, conforme solicitado
                const maxLogoWidth = 80; 
                const imgWidth = Math.min(maxLogoWidth, img.width); 
                const imgHeight = (img.height * imgWidth) / img.width;
                doc.addImage(logoDataUrl, 'PNG', margin, cursorY, imgWidth, imgHeight);
            } catch (e) {
                console.error("Erro logo:", e);
            }
        }

        // 2. Cabeçalho Texto (Informações da Empresa)
        const companyInfoX = pageWidth - margin;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        
        // Usa o nome da empresa selecionada
        doc.text(empresaNome, companyInfoX, cursorY + 10, { align: 'right' });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("Rua Aristides Alves de Oliveira, 94", companyInfoX, cursorY + 25, { align: 'right' });
        doc.text("São Pedro da União MG 37855 - 000", companyInfoX, cursorY + 40, { align: 'right' });
        doc.text("WHATS: (35) 99903 - 2302", companyInfoX, cursorY + 55, { align: 'right' });

        cursorY += 80;

        // 3. Linha Vermelha Superior
        doc.setDrawColor(redColor[0], redColor[1], redColor[2]);
        doc.setLineWidth(1.5);
        doc.line(margin, cursorY, pageWidth - margin, cursorY);
        cursorY += 20;

        // 4. Título e Dados do Cliente
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("Checklist de Pedido", margin, cursorY);
        cursorY += 25;

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

        // 5. Subtítulo "Caixas:" e Linha
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Caixas:", margin, cursorY);
        cursorY += 15;
        
        doc.setDrawColor(redColor[0], redColor[1], redColor[2]);
        doc.setLineWidth(1.5);
        doc.line(margin, cursorY - 8, pageWidth - margin, cursorY - 8);

        // 6. Tabela
        // Monta os dados da tabela
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
            startY: cursorY,
            theme: 'grid',
            headStyles: {
                fillColor: tableHeaderColor,
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            styles: {
                font: 'helvetica',
                fontSize: 10,
                cellPadding: 5
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            margin: { left: margin, right: margin }
        });
    }

    /**
     * Gera PDF Individual (Do formulário ou de um pedido salvo)
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
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF("p", "pt", "a4");
            
            // Desenha o pedido
            drawOrderOnPage(doc, pedido);

            const nomeArquivo = `${pedido.cliente.replace(/ /g, '_') || 'pedido'}.pdf`;
            doc.save(nomeArquivo);
            showToast('✅ PDF gerado com sucesso!');

        } catch (error) {
            console.error(error);
            showToast('❌ Erro ao gerar PDF.', 'error');
        }
    }

    /**
     * Gera PDF com TODOS os pedidos salvos
     */
    function generateAllOrdersPDF() {
        const pedidos = getPedidosFromStorage();
        
        if (pedidos.length === 0) {
            showToast('Não há pedidos salvos para gerar.', 'error');
            return;
        }

        try {
            showToast('📄 Gerando Relatório Geral...', 'info');
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF("p", "pt", "a4");

            // Ordena por data de envio (ou salvamento)
            pedidos.sort((a, b) => new Date(b.dataSalvo) - new Date(a.dataSalvo));

            pedidos.forEach((pedido, index) => {
                // Adiciona nova página se não for o primeiro
                if (index > 0) {
                    doc.addPage();
                }
                // Desenha o pedido na página
                drawOrderOnPage(doc, pedido);
            });

            const dataHoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
            doc.save(`Todos_Pedidos_${dataHoje}.pdf`);
            showToast('✅ PDF Geral gerado com sucesso!');

        } catch (error) {
            console.error(error);
            showToast('❌ Erro ao gerar PDF Geral.', 'error');
        }
    }


    // --- FUNÇÕES AUXILIARES GERAIS ---

    function getPedidosFromStorage() {
        return JSON.parse(localStorage.getItem('pedidosStudioNana')) || [];
    }

    function getPedidoById(id) {
        const pedidos = getPedidosFromStorage();
        return pedidos.find(p => p.id === id) || null;
    }

    function showToast(message, type = 'success') {
        toastMessage.textContent = message;
        toastMessage.className = type;
        toastMessage.classList.add('show');
        setTimeout(() => {
            toastMessage.classList.remove('show');
        }, 3000);
    }

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

    function loadLogo() {
        const dataUrl = localStorage.getItem('logoStudioNana');
        if (dataUrl) {
            logoPreview.src = dataUrl;
            logoPreview.style.display = 'block';
        }
    }

    // --- EVENT LISTENERS ---
    
    pedidoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        savePedido();
    });

    addModeloBtn.addEventListener('click', () => {
        const nomeModelo = prompt('Digite o nome do novo modelo de caixa:');
        if (nomeModelo) {
            addCaixaRow(nomeModelo, '', '', '', false);
        }
    });

    novoPedidoBtn.addEventListener('click', clearForm);
    gerarPdfBtn.addEventListener('click', () => generatePDF(null));
    btnPdfTodos.addEventListener('click', generateAllOrdersPDF);

    searchPedidos.addEventListener('input', loadPedidosList);

    pedidosList.addEventListener('click', (e) => {
        const target = e.target;
        const id = target.dataset.id;
        if (!id) return;

        if (target.classList.contains('btn-edit')) {
            loadPedidoForEdit(id);
            window.scrollTo(0, 0); 
        } else if (target.classList.contains('btn-delete')) {
            deletePedido(id);
        } else if (target.classList.contains('btn-view-pdf')) {
            generatePDF(id);
        }
    });

    logoUpload.addEventListener('change', handleLogoUpload);

    // Listener para salvar a escolha da empresa
    empresaSelect.addEventListener('change', () => {
        localStorage.setItem('empresaSelecionada', empresaSelect.value);
    });

    // --- INICIALIZAÇÃO ---
    loadDefaultModels();
    loadPedidosList();
    loadLogo();

    // Carrega a empresa salva
    const empresaSalva = localStorage.getItem('empresaSelecionada');
    if (empresaSalva) {
        empresaSelect.value = empresaSalva;
    }
});
