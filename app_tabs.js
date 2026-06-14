// 参考文献提取完整性审核系统
class CompletenessReviewApp {
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
    }

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
        document.querySelectorAll('.tab-btn').forEach((btn, i) => {
            btn.classList.toggle('active', i === index);
        });
        this.initMindmap();
        this.closeSidebar();
        this.updateStats();
    }

    initMindmap() {
        const container = document.getElementById('mindmap');
        const doc = this.documents[this.currentDocIndex];
        if (this.mindmap) this.mindmap.destroy();
        this.mindmap = new MindmapRenderer(container, doc, doc.id);
        this.mindmap.onNodeClick = (nodeData) => this.showNodeDetail(nodeData);
    }

    bindEvents() {
        document.getElementById('close-sidebar').addEventListener('click', () => this.closeSidebar());
        document.getElementById('save-btn').addEventListener('click', () => this.saveProgress());
        document.getElementById('export-btn').addEventListener('click', () => this.exportReport());
        document.getElementById('close-modal').addEventListener('click', () => this.closeNoteModal());
        document.getElementById('cancel-note').addEventListener('click', () => this.closeNoteModal());
        document.getElementById('save-note').addEventListener('click', () => this.saveNote());
        document.querySelectorAll('.tag-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tag = e.target.dataset.tag;
                const textarea = document.getElementById('note-text');
                textarea.value += (textarea.value ? '\n' : '') + tag;
            });
        });
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

        if (nodeData.type === 'section') {
            content.innerHTML = this.renderSectionDetail(nodeData);
        } else if (nodeData.type === 'event') {
            content.innerHTML = this.renderEventDetail(nodeData);
        } else if (nodeData.type === 'chapter') {
            content.innerHTML = this.renderChapterDetail(nodeData);
        } else {
            content.innerHTML = `<div class="placeholder"><p>点击子节点查看详情</p></div>`;
        }

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
                            <i class="fas fa-check"></i> 完整
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
                    <h4><i class="fas fa-file-alt"></i> 提取内容</h4>
                    <div class="content-box original">${section.data.content || '<em>无内容</em>'}</div>
                </div>

                <div class="notes-section">
                    <h4><i class="fas fa-exclamation-triangle"></i> 问题记录</h4>
                    <button class="btn btn-primary add-note-btn" style="margin-bottom: 15px;">
                        <i class="fas fa-plus"></i> 记录问题
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
                            <i class="fas fa-check"></i> 完整
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
                    <h4><i class="fas fa-exclamation-triangle"></i> 问题记录</h4>
                    <button class="btn btn-primary add-note-btn" style="margin-bottom: 15px;">
                        <i class="fas fa-plus"></i> 记录问题
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
        const childCount = chapter.children ? chapter.children.length : 0;
        const reviewedCount = chapter.children ? chapter.children.filter(c => {
            const id = c.data?.id;
            return id && this.reviewData[id]?.status === 'reviewed';
        }).length : 0;

        return `
            <div class="node-detail active">
                <div class="detail-header">
                    <h3>${chapter.name}</h3>
                </div>
                <div class="content-section">
                    <div class="meta-info">
                        <span><strong>子节点数:</strong> ${childCount}</span>
                        <span><strong>已审核:</strong> ${reviewedCount}/${childCount}</span>
                    </div>
                    <p style="margin-top: 12px; color: #666;">展开子节点逐个审核内容完整性</p>
                </div>
            </div>
        `;
    }

    bindDetailEvents(nodeData) {
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

        document.querySelectorAll('.add-note-btn').forEach(btn => {
            btn.addEventListener('click', () => this.openNoteModal(nodeData.data.id));
        });

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
        if (this.currentNode) this.showNodeDetail(this.currentNode);
        this.showNotification('问题已记录');
    }

    deleteNote(nodeId, index) {
        if (this.reviewData[nodeId]?.notes) {
            this.reviewData[nodeId].notes.splice(index, 1);
            this.saveReviewData();
            if (this.currentNode) this.showNodeDetail(this.currentNode);
        }
    }

    updateStatus(nodeId, status) {
        if (!this.reviewData[nodeId]) {
            this.reviewData[nodeId] = { status: 'pending', notes: [] };
        }
        this.reviewData[nodeId].status = status;
        this.saveReviewData();
    }

    loadReviewData() {
        const saved = localStorage.getItem('thailand_completeness_review');
        return saved ? JSON.parse(saved) : {};
    }

    saveReviewData() {
        localStorage.setItem('thailand_completeness_review', JSON.stringify(this.reviewData));
    }

    saveProgress() {
        this.saveReviewData();
        this.showNotification('进度已保存');
    }

    updateStats() {
        let reviewed = 0, pending = 0, needMore = 0;
        this.documents.forEach(doc => {
            doc.sections.forEach((s, i) => {
                const id = `${doc.id}_section_${i}`;
                const status = this.reviewData[id]?.status || 'pending';
                if (status === 'reviewed') reviewed++;
                else if (status === 'need-more') needMore++;
                else pending++;
            });
            doc.events.forEach((e, i) => {
                const id = `${doc.id}_event_${i}`;
                const status = this.reviewData[id]?.status || 'pending';
                if (status === 'reviewed') reviewed++;
                else if (status === 'need-more') needMore++;
                else pending++;
            });
        });
        document.getElementById('reviewed-count').textContent = reviewed;
        document.getElementById('pending-count').textContent = pending;
        document.getElementById('need-more-count').textContent = needMore;
    }

    exportReport() {
        const report = this.generateReport();
        const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `完整性审核报告_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showNotification('报告已导出');
    }

    generateReport() {
        let report = '参考文献提取完整性审核报告\n';
        report += '='.repeat(60) + '\n';
        report += `生成时间: ${new Date().toLocaleString('zh-CN')}\n\n`;

        this.documents.forEach(doc => {
            report += `\n${'='.repeat(60)}\n`;
            report += `文档: ${doc.name}\n`;
            report += `标题: ${doc.full_title}\n`;
            report += '-'.repeat(60) + '\n\n';

            report += '【章节审核】\n';
            doc.sections.forEach((s, i) => {
                const id = `${doc.id}_section_${i}`;
                const review = this.reviewData[id] || {};
                const status = review.status || 'pending';
                const icon = status === 'reviewed' ? '✓' : status === 'need-more' ? '✗' : '○';
                report += `[${icon}] ${s.number}. ${s.title}\n`;
                if (review.notes?.length > 0) {
                    review.notes.forEach(note => {
                        report += `    问题: ${note.text}\n`;
                    });
                }
            });

            report += '\n【事件审核】\n';
            doc.events.forEach((e, i) => {
                const id = `${doc.id}_event_${i}`;
                const review = this.reviewData[id] || {};
                const status = review.status || 'pending';
                const icon = status === 'reviewed' ? '✓' : status === 'need-more' ? '✗' : '○';
                report += `[${icon}] ${e.domain} - ${e.description.substring(0, 50)}...\n`;
                if (review.notes?.length > 0) {
                    review.notes.forEach(note => {
                        report += `    问题: ${note.text}\n`;
                    });
                }
            });
        });

        return report;
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 80px; right: 20px;
            background: var(--thai-blue, #2563eb); color: white;
            padding: 12px 20px; border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new CompletenessReviewApp();
});
