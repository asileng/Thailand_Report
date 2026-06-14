// XML数据管理模块
// 用于读写XML格式的数据和审核状态

class XMLDataManager {
    constructor() {
        this.xmlPath = 'data.xml';
        this.parser = new DOMParser();
        this.serializer = new XMLSerializer();
        this.xmlDoc = null;
        this.reviewData = this.loadReviewData();
    }

    // 加载XML文件
    async loadXML() {
        try {
            const response = await fetch(this.xmlPath);
            const xmlText = await response.text();
            this.xmlDoc = this.parser.parseFromString(xmlText, 'text/xml');
            return this.xmlDoc;
        } catch (error) {
            console.error('Error loading XML:', error);
            return null;
        }
    }

    // 获取所有sections
    getSections() {
        if (!this.xmlDoc) return [];

        const sections = [];
        const sectionElements = this.xmlDoc.querySelectorAll('section');

        sectionElements.forEach(sectionElem => {
            const section = {
                id: sectionElem.getAttribute('id'),
                section_number: sectionElem.getAttribute('section_number'),
                review_status: sectionElem.getAttribute('review_status') || 'pending',
                title: sectionElem.querySelector('title')?.textContent || '',
                content: sectionElem.querySelector('content')?.textContent || '',
                links: [],
                features: []
            };

            // 解析链接
            const linkElements = sectionElem.querySelectorAll('links link');
            linkElements.forEach(linkElem => {
                section.links.push({
                    id: linkElem.getAttribute('id'),
                    url: linkElem.querySelector('url')?.textContent || '',
                    description: linkElem.querySelector('description')?.textContent || '',
                    source_type: linkElem.getAttribute('source_type') || '',
                    content_type: linkElem.getAttribute('content_type') || ''
                });
            });

            // 解析实体
            const featureElements = sectionElem.querySelectorAll('features feature');
            featureElements.forEach(featureElem => {
                const feature = {
                    type: featureElem.getAttribute('type'),
                    name: featureElem.querySelector('name')?.textContent || ''
                };
                const yearElem = featureElem.querySelector('year');
                if (yearElem) {
                    feature.year = yearElem.textContent;
                }
                section.features.push(feature);
            });

            sections.push(section);
        });

        return sections;
    }

    // 获取审核状态
    getReviewStatus(sectionId) {
        return this.reviewData[sectionId]?.status || 'pending';
    }

    // 设置审核状态
    setReviewStatus(sectionId, status) {
        if (!this.reviewData[sectionId]) {
            this.reviewData[sectionId] = {
                status: 'pending',
                notes: [],
                coverage_status: null
            };
        }
        this.reviewData[sectionId].status = status;
        this.saveReviewData();
        this.updateXMLStatus(sectionId, status);
    }

    // 获取注释
    getNotes(sectionId) {
        return this.reviewData[sectionId]?.notes || [];
    }

    // 添加注释
    addNote(sectionId, noteText) {
        if (!this.reviewData[sectionId]) {
            this.reviewData[sectionId] = {
                status: 'pending',
                notes: [],
                coverage_status: null
            };
        }
        this.reviewData[sectionId].notes.push({
            text: noteText,
            time: new Date().toLocaleString('zh-CN')
        });
        this.saveReviewData();
    }

    // 删除注释
    deleteNote(sectionId, noteIndex) {
        if (this.reviewData[sectionId]?.notes) {
            this.reviewData[sectionId].notes.splice(noteIndex, 1);
            this.saveReviewData();
        }
    }

    // 获取覆盖状态
    getCoverageStatus(sectionId) {
        return this.reviewData[sectionId]?.coverage_status || null;
    }

    // 设置覆盖状态
    setCoverageStatus(sectionId, status) {
        if (!this.reviewData[sectionId]) {
            this.reviewData[sectionId] = {
                status: 'pending',
                notes: [],
                coverage_status: null
            };
        }
        this.reviewData[sectionId].coverage_status = status;
        this.saveReviewData();
    }

    // 更新XML中的审核状态
    updateXMLStatus(sectionId, status) {
        if (!this.xmlDoc) return;

        const sectionElem = this.xmlDoc.querySelector(`section[id="${sectionId}"]`);
        if (sectionElem) {
            sectionElem.setAttribute('review_status', status);
        }
    }

    // 加载审核数据（从localStorage）
    loadReviewData() {
        try {
            const saved = localStorage.getItem('thailand_report_review_xml');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Error loading review data:', error);
            return {};
        }
    }

    // 保存审核数据（到localStorage）
    saveReviewData() {
        try {
            localStorage.setItem('thailand_report_review_xml', JSON.stringify(this.reviewData));
        } catch (error) {
            console.error('Error saving review data:', error);
        }
    }

    // 导出审核数据为XML
    exportReviewXML() {
        if (!this.xmlDoc) return null;

        // 更新XML中的审核状态
        Object.entries(this.reviewData).forEach(([sectionId, data]) => {
            this.updateXMLStatus(sectionId, data.status);
        });

        // 添加审核数据到XML
        let reviewElem = this.xmlDoc.querySelector('review_data');
        if (!reviewElem) {
            reviewElem = this.xmlDoc.createElement('review_data');
            this.xmlDoc.documentElement.appendChild(reviewElem);
        }

        // 清空现有审核数据
        reviewElem.innerHTML = '';

        // 添加每个section的审核数据
        Object.entries(this.reviewData).forEach(([sectionId, data]) => {
            const sectionReview = this.xmlDoc.createElement('section_review');
            sectionReview.setAttribute('section_id', sectionId);
            sectionReview.setAttribute('status', data.status);
            sectionReview.setAttribute('coverage_status', data.coverage_status || '');

            // 添加注释
            if (data.notes && data.notes.length > 0) {
                const notesElem = this.xmlDoc.createElement('notes');
                data.notes.forEach(note => {
                    const noteElem = this.xmlDoc.createElement('note');
                    noteElem.setAttribute('time', note.time);
                    noteElem.textContent = note.text;
                    notesElem.appendChild(noteElem);
                });
                sectionReview.appendChild(notesElem);
            }

            reviewElem.appendChild(sectionReview);
        });

        // 序列化XML
        const xmlStr = this.serializer.serializeToString(this.xmlDoc);

        // 格式化XML
        const formattedXml = this.formatXml(xmlStr);

        return formattedXml;
    }

    // 导入审核数据从XML
    importReviewXML(xmlText) {
        try {
            const xmlDoc = this.parser.parseFromString(xmlText, 'text/xml');
            const reviewElem = xmlDoc.querySelector('review_data');

            if (!reviewElem) {
                console.error('No review_data found in XML');
                return false;
            }

            // 清空现有审核数据
            this.reviewData = {};

            // 解析每个section的审核数据
            const sectionReviews = reviewElem.querySelectorAll('section_review');
            sectionReviews.forEach(sectionReview => {
                const sectionId = sectionReview.getAttribute('section_id');
                const status = sectionReview.getAttribute('status');
                const coverageStatus = sectionReview.getAttribute('coverage_status');

                this.reviewData[sectionId] = {
                    status: status || 'pending',
                    notes: [],
                    coverage_status: coverageStatus || null
                };

                // 解析注释
                const noteElements = sectionReview.querySelectorAll('note');
                noteElements.forEach(noteElem => {
                    this.reviewData[sectionId].notes.push({
                        time: noteElem.getAttribute('time'),
                        text: noteElem.textContent
                    });
                });
            });

            // 保存到localStorage
            this.saveReviewData();

            return true;
        } catch (error) {
            console.error('Error importing review XML:', error);
            return false;
        }
    }

    // 格式化XML
    formatXml(xml) {
        let formatted = '';
        let indent = '';
        const tab = '  ';

        xml.split(/>\s*</).forEach(function(node) {
            if (node.match(/^\/\w/)) indent = indent.substring(tab.length);
            formatted += indent + '<' + node + '>\n';
            if (node.match(/^<?\w[^>]*[^\/]$/)) indent += tab;
        });

        return formatted.substring(1, formatted.length - 2);
    }

    // 获取统计信息
    getStats(sections) {
        let reviewed = 0, pending = 0, needMore = 0;

        sections.forEach(section => {
            const status = this.getReviewStatus(section.id);
            if (status === 'reviewed') reviewed++;
            else if (status === 'need-more') needMore++;
            else pending++;
        });

        return { reviewed, pending, needMore };
    }

    // 导出审核报告为文本
    exportReportText(sections) {
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
            const status = this.getReviewStatus(section.id);
            const notes = this.getNotes(section.id);

            report += `[${status === 'reviewed' ? '✓' : status === 'need-more' ? '✗' : '○'}] ${section.title}\n`;

            if (section.links && section.links.length > 0) {
                report += `  参考链接: ${section.links.length}个\n`;
                section.links.forEach(link => {
                    report += `    - ${link.url}\n`;
                    report += `      ${link.description}\n`;
                });
            }

            if (notes && notes.length > 0) {
                report += '  审核注释:\n';
                notes.forEach(note => {
                    report += `    [${note.time}] ${note.text}\n`;
                });
            }

            report += '\n';
        });

        return report;
    }

    // 下载文件
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // 导出审核数据为XML文件
    exportReviewXMLFile() {
        const xmlContent = this.exportReviewXML();
        if (xmlContent) {
            this.downloadFile(xmlContent, 'review_data.xml', 'application/xml');
        }
    }

    // 导出审核报告为文本文件
    exportReportTextFile(sections) {
        const reportText = this.exportReportText(sections);
        this.downloadFile(reportText, 'review_report.txt', 'text/plain');
    }
}

// 创建全局实例
window.xmlDataManager = new XMLDataManager();
