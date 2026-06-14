// 主应用逻辑
class ThailandReportApp {
    constructor() {
        this.data = reportData;
        this.mindmap = null;
        this.currentNode = null;
        this.reviewData = this.loadReviewData();

        this.init();
    }

    init() {
        // 初始化思维导图
        this.initMindmap();

        // 绑定事件
        this.bindEvents();

        // 更新统计
        this.updateStats();

        console.log('泰国报告审核系统已初始化');
    }

    initMindmap() {
        const container = document.getElementById('mindmap');
        this.mindmap = new MindmapRenderer(container, this.data);

        // 设置节点点击回调
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

        // 对比模态框
        document.getElementById('close-compare').addEventListener('click', () => {
            this.closeCompareModal();
        });

        document.getElementById('save-compare').addEventListener('click', () => {
            this.saveCompare();
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSidebar();
                this.closeNoteModal();
                this.closeCompareModal();
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
        } else if (nodeData.type === 'link') {
            html = this.renderLinkDetail(nodeData);
        } else if (nodeData.type === 'description') {
            html = this.renderDescriptionDetail(nodeData);
        } else {
            html = this.renderDefaultDetail(nodeData);
        }

        content.innerHTML = html;
        sidebar.classList.add('open');

        // 绑定详情内的事件
        this.bindDetailEvents(nodeData);
    }

    renderSectionDetail(section) {
        const status = this.reviewData[section.data.id]?.status || section.data.review_status || 'pending';
        const notes = this.reviewData[section.data.id]?.notes || section.data.notes || [];

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
                    <h4><i class="fas fa-file-alt"></i> 原文内容</h4>
                    <div class="content-box original">${section.data.content}</div>
                </div>

                ${section.data.links.length > 0 ? `
                <div class="content-section">
                    <h4><i class="fas fa-link"></i> 参考链接 (${section.data.links.length})</h4>
                    <ul class="links-list">
                        ${section.data.links.map(link => `
                            <li class="link-item" data-link-id="${link.id}">
                                <a href="${link.url}" target="_blank" class="link-url">
                                    <i class="fas fa-external-link-alt"></i> ${link.url}
                                </a>
                                <div class="link-description">${link.description}</div>
                                <div class="link-meta">
                                    <span class="link-badge source-${link.source_type === '原文来源' ? 'original' : link.source_type === '新闻来源' ? 'news' : 'reference'}">
                                        ${link.source_type || '参考来源'}
                                    </span>
                                    <span class="link-badge content-${link.content_type === '政策原文' ? 'policy' : link.content_type === '相关新闻' ? 'news' : 'data'}">
                                        ${link.content_type || '参考来源'}
                                    </span>
                                </div>
                                <div class="link-actions">
                                    <button class="link-btn compare-btn" data-link-id="${link.id}">
                                        <i class="fas fa-columns"></i> 对比
                                    </button>
                                    <button class="link-btn note-btn" data-link-id="${link.id}">
                                        <i class="fas fa-sticky-note"></i> 注释
                                    </button>
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                ` : ''}

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

    renderLinkDetail(link) {
        return `
            <div class="node-detail active">
                <div class="detail-header">
                    <h3><i class="fas fa-link"></i> 链接详情</h3>
                </div>

                <div class="content-section">
                    <h4><i class="fas fa-globe"></i> 链接地址</h4>
                    <a href="${link.data.url}" target="_blank" class="link-url" style="font-size: 1.1rem;">
                        ${link.data.url}
                    </a>
                </div>

                <div class="content-section">
                    <h4><i class="fas fa-info-circle"></i> 链接描述</h4>
                    <div class="content-box">${link.data.description}</div>
                </div>

                <div class="link-actions" style="margin-top: 20px;">
                    <button class="btn btn-primary" onclick="window.open('${link.data.url}', '_blank')">
                        <i class="fas fa-external-link-alt"></i> 访问链接
                    </button>
                    <button class="btn btn-secondary compare-link-btn">
                        <i class="fas fa-columns"></i> 对比内容
                    </button>
                </div>
            </div>
        `;
    }

    renderDescriptionDetail(desc) {
        return `
            <div class="node-detail active">
                <div class="detail-header">
                    <h3><i class="fas fa-align-left"></i> 链接描述详情</h3>
                </div>

                <div class="content-section">
                    <h4><i class="fas fa-quote-left"></i> 完整描述</h4>
                    <div class="content-box">${desc.data.description}</div>
                </div>

                <div class="content-section">
                    <h4><i class="fas fa-link"></i> 所属链接</h4>
                    <a href="${desc.data.url}" target="_blank" class="link-url">
                        ${desc.data.url}
                    </a>
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
                    <p>状态: ${node.status || '待审核'}</p>
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

                // 更新UI
                document.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');

                // 更新思维导图
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

        // 对比按钮
        document.querySelectorAll('.compare-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const linkId = e.currentTarget.dataset.linkId;
                const link = nodeData.data.links.find(l => l.id === linkId);
                if (link) {
                    this.openCompareModal(nodeData.data.content, link);
                }
            });
        });

        // 链接对比按钮
        document.querySelectorAll('.compare-link-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.openCompareModal('', nodeData.data);
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

        // 刷新侧边栏
        if (this.currentNode) {
            this.showNodeDetail(this.currentNode);
        }

        this.showNotification('注释已保存');
    }

    deleteNote(nodeId, index) {
        if (this.reviewData[nodeId]?.notes) {
            this.reviewData[nodeId].notes.splice(index, 1);
            this.saveReviewData();

            // 刷新侧边栏
            if (this.currentNode) {
                this.showNodeDetail(this.currentNode);
            }
        }
    }

    // 对比功能
    openCompareModal(originalContent, link) {
        this.currentCompareLink = link;

        document.getElementById('original-content').textContent = originalContent || '无原文内容';
        document.getElementById('reference-content').innerHTML = `
            <div class="fetch-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>正在获取参考资料...</p>
            </div>
        `;

        document.getElementById('compare-modal').classList.add('active');

        // 尝试获取链接内容（由于跨域限制，可能失败）
        this.fetchLinkContent(link.url);
    }

    closeCompareModal() {
        document.getElementById('compare-modal').classList.remove('active');
    }

    fetchLinkContent(url) {
        // 由于跨域限制，直接显示链接信息
        setTimeout(() => {
            document.getElementById('reference-content').innerHTML = `
                <p><strong>链接:</strong> <a href="${url}" target="_blank">${url}</a></p>
                <p><strong>描述:</strong> ${this.currentCompareLink.description}</p>
                <hr>
                <p style="color: var(--text-secondary); font-style: italic;">
                    由于浏览器安全限制，无法直接加载外部链接内容。
                    请点击上方链接在新标签页中查看完整内容。
                </p>
            `;
        }, 1000);
    }

    saveCompare() {
        const complete = document.getElementById('coverage-complete').checked;
        const partial = document.getElementById('coverage-partial').checked;
        const missing = document.getElementById('coverage-missing').checked;

        let status = null;
        if (complete) status = 'complete';
        else if (partial) status = 'partial';
        else if (missing) status = 'missing';

        if (status && this.currentNode?.data?.id) {
            if (!this.reviewData[this.currentNode.data.id]) {
                this.reviewData[this.currentNode.data.id] = { status: 'pending', notes: [] };
            }
            this.reviewData[this.currentNode.data.id].coverage_status = status;
            this.saveReviewData();
        }

        this.closeCompareModal();
        this.showNotification('对比评估已保存');
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
        const saved = localStorage.getItem('thailand_report_review');
        return saved ? JSON.parse(saved) : {};
    }

    saveReviewData() {
        localStorage.setItem('thailand_report_review', JSON.stringify(this.reviewData));
    }

    saveProgress() {
        this.saveReviewData();
        this.showNotification('审核进度已保存');
    }

    // 统计更新
    updateStats() {
        let reviewed = 0, pending = 0, needMore = 0;

        this.data.sections.forEach(section => {
            const status = this.reviewData[section.id]?.status || section.review_status || 'pending';
            if (status === 'reviewed') reviewed++;
            else if (status === 'need-more') needMore++;
            else pending++;
        });

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
        a.download = `泰国报告审核报告_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('审核报告已导出');
    }

    generateReport() {
        let report = '泰国投资报告 - 参考资料审核报告\n';
        report += '='.repeat(50) + '\n';
        report += `生成时间: ${new Date().toLocaleString('zh-CN')}\n\n`;

        // 统计信息
        let reviewed = 0, pending = 0, needMore = 0;
        this.data.sections.forEach(section => {
            const status = this.reviewData[section.id]?.status || section.review_status || 'pending';
            if (status === 'reviewed') reviewed++;
            else if (status === 'need-more') needMore++;
            else pending++;
        });

        report += '统计信息:\n';
        report += `- 已审核: ${reviewed}\n`;
        report += `- 待审核: ${pending}\n`;
        report += `- 需补充: ${needMore}\n\n`;

        // 详细信息
        report += '详细审核结果:\n';
        report += '-'.repeat(50) + '\n\n';

        this.data.sections.forEach(section => {
            const review = this.reviewData[section.id] || {};
            const status = review.status || section.review_status || 'pending';

            report += `[${status === 'reviewed' ? '✓' : status === 'need-more' ? '✗' : '○'}] ${section.title}\n`;

            if (section.links.length > 0) {
                report += `  参考链接: ${section.links.length}个\n`;
                section.links.forEach(link => {
                    report += `    - ${link.url}\n`;
                    report += `      ${link.description}\n`;
                });
            }

            if (review.notes && review.notes.length > 0) {
                report += '  审核注释:\n';
                review.notes.forEach(note => {
                    report += `    [${note.time}] ${note.text}\n`;
                });
            }

            report += '\n';
        });

        return report;
    }

    // 通知提示
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
    window.app = new ThailandReportApp();
});
