// 统一数据管理模块
// 用于在思维导图页面和实体覆盖检查页面之间共享审核状态

class ReviewDataManager {
    constructor() {
        this.storageKey = 'thailand_report_review';
    }

    // 获取审核状态
    getStatus(sectionId) {
        const data = this.loadData();
        return data[sectionId]?.status || 'pending';
    }

    // 设置审核状态
    setStatus(sectionId, status) {
        const data = this.loadData();
        if (!data[sectionId]) {
            data[sectionId] = { status: 'pending', notes: [], coverage_status: null };
        }
        data[sectionId].status = status;
        this.saveData(data);
    }

    // 获取注释
    getNotes(sectionId) {
        const data = this.loadData();
        return data[sectionId]?.notes || [];
    }

    // 添加注释
    addNote(sectionId, noteText) {
        const data = this.loadData();
        if (!data[sectionId]) {
            data[sectionId] = { status: 'pending', notes: [], coverage_status: null };
        }
        data[sectionId].notes.push({
            text: noteText,
            time: new Date().toLocaleString('zh-CN')
        });
        this.saveData(data);
    }

    // 删除注释
    deleteNote(sectionId, noteIndex) {
        const data = this.loadData();
        if (data[sectionId]?.notes) {
            data[sectionId].notes.splice(noteIndex, 1);
            this.saveData(data);
        }
    }

    // 获取覆盖状态
    getCoverageStatus(sectionId) {
        const data = this.loadData();
        return data[sectionId]?.coverage_status || null;
    }

    // 设置覆盖状态
    setCoverageStatus(sectionId, status) {
        const data = this.loadData();
        if (!data[sectionId]) {
            data[sectionId] = { status: 'pending', notes: [], coverage_status: null };
        }
        data[sectionId].coverage_status = status;
        this.saveData(data);
    }

    // 获取所有数据
    loadData() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
        } catch (e) {
            console.error('Error loading review data:', e);
            return {};
        }
    }

    // 保存数据
    saveData(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (e) {
            console.error('Error saving review data:', e);
        }
    }

    // 获取统计信息
    getStats(sections) {
        const data = this.loadData();
        let reviewed = 0, pending = 0, needMore = 0;

        sections.forEach(section => {
            const status = data[section.id]?.status || section.review_status || 'pending';
            if (status === 'reviewed') reviewed++;
            else if (status === 'need-more') needMore++;
            else pending++;
        });

        return { reviewed, pending, needMore };
    }

    // 导出审核报告
    exportReport(sections) {
        const data = this.loadData();
        let report = '泰国投资报告 - 参考资料审核报告\n';
        report += '='.repeat(50) + '\n';
        report += `生成时间: ${new Date().toLocaleString('zh-CN')}\n\n`;

        // 统计信息
        const stats = this.getStats(sections);
        report += '统计信息:\n';
        report += `- 已审核: ${stats.reviewed}\n`;
        report += `- 待审核: ${stats.pending}\n`;
        report += `- 需补充: ${stats.needMore}\n\n`;

        // 详细信息
        report += '详细审核结果:\n';
        report += '-'.repeat(50) + '\n\n';

        sections.forEach(section => {
            const review = data[section.id] || {};
            const status = review.status || section.review_status || 'pending';

            report += `[${status === 'reviewed' ? '✓' : status === 'need-more' ? '✗' : '○'}] ${section.title}\n`;

            if (section.links && section.links.length > 0) {
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
}

// 创建全局实例
window.reviewDataManager = new ReviewDataManager();
