// 多文档审核系统主应用
class MultiDocReviewApp {
    constructor() {
        this.documents = documentsData;
        this.currentDocIndex = 0;
        this.mindmap = null;
        this.currentNode = null;
        this.reviewData = this.loadReviewData();

        this.init();
    }

    init() {
        this.initTabs();
        this.initMindmap();
        this.bindEvents();
        this.updateStats();

        console.log('多文档审核系统已初始化');
    }

    // 标签页初始化
    initTabs() {
        const bar = document.getElementById('tab-bar');
        this.documents.forEach((doc, i) => {
            const btn = document.createElement('button');
            btn.className = 'tab-btn' + (i === 0 ? ' active' : '');
            btn.innerHTML = `<i class="fas fa-file-alt"></i> ${doc.name}`;
            btn.dataset.index = i;
            btn.addEventListener('click', () => this.switchDoc(i));
            bar.appendChild(btn);
        });
    }

    switchDoc(index) {
        this.currentDocIndex = index;
        this.currentNode = null;

        // 更新标签页样式
        document.querySelectorAll('.tab-btn').forEach((btn, i) => {
            btn.classList.toggle('active', i === index);
        });

        // 重新渲染思维导图
        this.initMindmap();
        this.closeSidebar();
        this.updateStats();
    }

    // 思维导图初始化
    initMindmap() {
        const container = document.getElementById('mindmap');
        const doc = this.documents[this.currentDocIndex];

        if (this.mindmap) {
            this.mindmap.destroy();
        }

        this.mindmap = new MindmapRenderer(container, doc, doc.id);

        this.mindmap.onNodeClick = (nodeData) => {
            this.showNodeDetail(nodeData);
        };
    }

    bindEvents() {
        // 关闭侧边栏
        document.getElementById('close-sidebar').addEventListener('click', () => {
            this.closeSidebar();
        });

        // 保存按钮
        document.getElementById('save-btn').addEventListener('click', () => {
            this.saveProgress();
        });

        // 导出按钮
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportReport();
        });

        // 注释模态框
        document.getElementById('close-modal').addEventListener('click', () => {
            this.closeNoteModal();
        });

        document.getElementById('cancel-note').addEventListener('click', () => {
            this.closeNoteModal();
        });

        document.getElementById('save-note').addEventListener('click', () => {
            this.saveNote();
        });

        // 快速标签按钮
        document.querySelectorAll('.tag-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tag = e.target.dataset.tag;
                const textarea = document.getElementById('note-text');
                textarea.value += (textarea.value ? '\n' : '') + tag;
            });
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSidebar();
                this.closeNoteModal();
            }
        });
    }

    showNodeDetail(nodeData) {
        this.currentNode = nodeData;

        const sidebar = document.getElementById('sidebar');
        const content = document.getElementById('sidebar-content');
        const title = document.getElementById('sidebar-title');

        title.textContent = nodeData.name;

        let html = '';

        if (nodeData.type === 'section') {
            html = this.renderSectionDetail(nodeData);
        } else if (nodeData.type === 'event') {
            html = this.renderEventDetail(nodeData);
        } else if (nodeData.type === 'chapter') {
            html = this.renderChapterDetail(nodeData);
        } else {
            html = this.renderDefaultDetail(nodeData);
        }

        content.innerHTML = html;
        sidebar.classList.add('open');

        this.bindDetailEvents(nodeData);
    }

    renderSectionDetail(section) {
        const status = this.reviewData[section.data.id]?.status || 'pending';
        const notes = this.reviewData[section.data.id]?.notes || [];

        return `
            <div class="node-detail active">
                <div class="detail-header">
                    <h3>${section.data.title}</h3>
                    <div class="status-selector">
                        <button class="status-btn reviewed ${status === 'reviewed' ? 'active' : ''}" data-status="reviewed">
                            <i class="fas fa-check"></i> 已审核
                        </button>
                        <button class="status-btn pending ${status === 'pending' ? 'active' : ''}" data-status="pending">
                            <i class="fas fa-clock"></i> 待审核
                        </button>
                        <button class="status-btn need-more ${status === 'need-more' ? 'active' : ''}" data-status="need-more">
                            <i class="fas fa-exclamation"></i> 需补充
                        </button>
                    </div>
                </div>

                <div class="content-section">
                    <h4><i class="fas fa-info-circle"></i> 元信息</h4>
                    <div class="meta-info">
                        <span><strong>编号:</strong> ${section.data.number}</span>
                        ${section.data.parent ? `<span><strong>父级:</strong> ${section.data.parent}</span>` : ''}
                    </div>
                </div>

                <div class="content-section">
                    <h4><i class="fas fa-file-alt"></i> 原文内容</h4>
                    <div class="content-box original">${section.data.content}</div>
                </div>

                <div class="notes-section">
                    <h4><i class="fas fa-sticky-note"></i> 审核注释</h4>
                    <button class="btn btn-primary add-note-btn" style="margin-bottom: 15px;">
                        <i class="fas fa-plus"></i> 添加注释
                    </button>
                    ${notes.map((note, index) => `
                        <div class="note-card">
                            <div class="note-time">${note.time || '刚刚'}</div>
                            <div class="note-text">${note.text}</div>
                            <button class="delete-note" data-note-index="${index}">&times;</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderEventDetail(event) {
        const status = this.reviewData[event.data.id]?.status || 'pending';
        const notes = this.reviewData[event.data.id]?.notes || [];

        return `
            <div class="node-detail active">
                <div class="detail-header">
                    <h3><i class="fas fa-bolt"></i> 政策事件</h3>
                    <div class="status-selector">
                        <button class="status-btn reviewed ${status === 'reviewed' ? 'active' : ''}" data-status="reviewed">
                            <i class="fas fa-check"></i> 已审核
                        </button>
                        <button class="status-btn pending ${status === 'pending' ? 'active' : ''}" data-status="pending">
                            <i class="fas fa-clock"></i> 待审核
                        </button>
                        <button class="status-btn need-more ${status === 'need-more' ? 'active' : ''}" data-status="need-more">
                            <i class="fas fa-exclamation"></i> 需补充
                        </button>
                    </div>
                </div>

                <div class="content-section">
                    <h4><i class="fas fa-book"></i> 来源</h4>
                    <div class="content-box">${event.data.source}</div>
                </div>

                <div class="content-section">
                    <h4><i class="fas fa-tag"></i> 领域</h4>
                    <div class="content-box">${event.data.domain}</div>
                </div>

                <div class="content-section">
                    <h4><i class="fas fa-align-left"></i> 事件描述</h4>
                    <div class="content-box original">${event.data.description}</div>
                </div>

                <div class="notes-section">
                    <h4><i class="fas fa-sticky-note"></i> 审核注释</h4>
                    <button class="btn btn-primary add-note-btn" style="margin-bottom: 15px;">
                        <i class="fas fa-plus"></i> 添加注释
                    </button>
                    ${notes.map((note, index) => `
                        <div class="note-card">
                            <div class="note-time">${note.time || '刚刚'}</div>
                            <div class="note-text">${note.text}</div>
                            <button class="delete-note" data-note-index="${index}">&times;</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderChapterDetail(chapter) {
        return `
            <div class="node-detail active">
                <div class="detail-header">
                    <h3>${chapter.name}</h3>
                </div>
                <div class="content-section">
                    <p>章节目录 - 包含 ${chapter.children ? chapter.children.length : 0} 个子节点</p>
                    <p>点击子节点查看详细信息</p>
                </div>
            </div>
        `;
    }

    renderDefaultDetail(node) {
        return `
            <div class="node-detail active">
                <div class="detail-header">
                    <h3>${node.name}</h3>
                </div>
                <div class="content-section">
                    <p>节点类型: ${node.type}</p>
                </div>
            </div>
        `;
    }

    bindDetailEvents(nodeData) {
        // 状态按钮
        document.querySelectorAll('.status-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const status = e.currentTarget.dataset.status;
                this.updateStatus(nodeData.data.id, status);

                document.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');

                this.mindmap.updateNodeStatus(nodeData.data.id, status);
                this.updateStats();
            });
        });

        // 添加注释按钮
        document.querySelectorAll('.add-note-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.openNoteModal(nodeData.data.id);
            });
        });

        // 删除注释按钮
        document.querySelectorAll('.delete-note').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.noteIndex);
                this.deleteNote(nodeData.data.id, index);
            });
        });
    }

    closeSidebar() {
        document.getElementById('sidebar').classList.remove('open');
    }

    // 注释功能
    openNoteModal(nodeId) {
        this.currentNoteNodeId = nodeId;
        document.getElementById('note-text').value = '';
        document.getElementById('note-modal').classList.add('active');
    }

    closeNoteModal() {
        document.getElementById('note-modal').classList.remove('active');
    }

    saveNote() {
        const text = document.getElementById('note-text').value.trim();
        if (!text) return;

        const nodeId = this.currentNoteNodeId;
        if (!this.reviewData[nodeId]) {
            this.reviewData[nodeId] = { status: 'pending', notes: [] };
        }

        this.reviewData[nodeId].notes.push({
            text: text,
            time: new Date().toLocaleString('zh-CN')
        });

        this.saveReviewData();
        this.closeNoteModal();

        if (this.currentNode) {
            this.showNodeDetail(this.currentNode);
        }

        this.showNotification('注释已保存');
    }

    deleteNote(nodeId, index) {
        if (this.reviewData[nodeId]?.notes) {
            this.reviewData[nodeId].notes.splice(index, 1);
            this.saveReviewData();

            if (this.currentNode) {
                this.showNodeDetail(this.currentNode);
            }
        }
    }

    // 状态更新
    updateStatus(nodeId, status) {
        if (!this.reviewData[nodeId]) {
            this.reviewData[nodeId] = { status: 'pending', notes: [] };
        }
        this.reviewData[nodeId].status = status;
        this.saveReviewData();
    }

    // 数据持久化
    loadReviewData() {
        const saved = localStorage.getItem('thailand_multi_doc_review');
        return saved ? JSON.parse(saved) : {};
    }

    saveReviewData() {
        localStorage.setItem('thailand_multi_doc_review', JSON.stringify(this.reviewData));
    }

    saveProgress() {
        this.saveReviewData();
        this.showNotification('审核进度已保存');
    }

    // 统计更新
    updateStats() {
        let totalSections = 0, totalEvents = 0, reviewed = 0, pending = 0, needMore = 0;

        this.documents.forEach(doc => {
            totalSections += doc.sections.length;
            totalEvents += doc.events.length;

            doc.sections.forEach((s, i) => {
                const id = `${doc.id}_section_${i}`;
                const status = this.reviewData[id]?.status || 'pending';
                if (status === 'reviewed') reviewed++;
                else if (status === 'need-more') needMore++;
                else pending++;
            });

            doc.events.forEach((e, i) => {
                // 事件的 status 需要从 section 事件中获取
            });
        });

        document.getElementById('total-sections').textContent = totalSections;
        document.getElementById('total-events').textContent = totalEvents;
        document.getElementById('reviewed-count').textContent = reviewed;
        document.getElementById('pending-count').textContent = pending;
        document.getElementById('need-more-count').textContent = needMore;
    }

    // 导出报告
    exportReport() {
        const report = this.generateReport();
        const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `泰国政策报告审核报告_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('审核报告已导出');
    }

    generateReport() {
        let report = '泰国政策报告 - 多文档审核报告\n';
        report += '='.repeat(60) + '\n';
        report += `生成时间: ${new Date().toLocaleString('zh-CN')}\n\n`;

        this.documents.forEach(doc => {
            report += `\n${'='.repeat(60)}\n`;
            report += `文档: ${doc.name}\n`;
            report += `完整标题: ${doc.full_title}\n`;
            report += `章节数: ${doc.sections.length} | 事件数: ${doc.events.length}\n`;
            report += '-'.repeat(60) + '\n\n';

            report += '【章节审核】\n';
            doc.sections.forEach((s, i) => {
                const id = `${doc.id}_section_${i}`;
                const review = this.reviewData[id] || {};
                const status = review.status || 'pending';
                const statusIcon = status === 'reviewed' ? '✓' : status === 'need-more' ? '✗' : '○';

                report += `[${statusIcon}] ${s.number}. ${s.title}\n`;

                if (review.notes && review.notes.length > 0) {
                    review.notes.forEach(note => {
                        report += `    注释 [${note.time}]: ${note.text}\n`;
                    });
                }
            });

            report += '\n【事件审核】\n';
            doc.events.forEach((e, i) => {
                const id = `${doc.id}_event_${i}`;
                const review = this.reviewData[id] || {};
                const status = review.status || 'pending';
                const statusIcon = status === 'reviewed' ? '✓' : status === 'need-more' ? '✗' : '○';

                report += `[${statusIcon}] ${e.domain} - ${e.description.substring(0, 50)}...\n`;
            });
        });

        return report;
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: var(--thai-blue);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            animation: fadeIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'fadeIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MultiDocReviewApp();
});
