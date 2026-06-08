// 思维导图渲染模块
class MindmapRenderer {
    constructor(container, data) {
        this.container = container;
        this.data = data;
        this.svg = null;
        this.g = null;
        this.tree = null;
        this.root = null;
        this.nodeWidth = 200;
        this.nodeHeight = 40;
        this.duration = 300;
        this.onNodeClick = null;

        this.init();
    }

    init() {
        // 清空容器
        this.container.innerHTML = '';

        // 创建SVG
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.svg = d3.select(this.container)
            .append('svg')
            .attr('class', 'mindmap-svg')
            .attr('width', width)
            .attr('height', height);

        // 创建缩放和平移
        const zoom = d3.zoom()
            .scaleExtent([0.3, 3])
            .on('zoom', (event) => {
                this.g.attr('transform', event.transform);
            });

        this.svg.call(zoom);

        // 创建主组
        this.g = this.svg.append('g')
            .attr('transform', `translate(100, ${height / 2})`);

        // 转换数据为树形结构
        this.treeData = this.transformData();

        // 创建树布局
        this.tree = d3.tree()
            .nodeSize([60, 280])
            .separation((a, b) => (a.parent === b.parent ? 1 : 1.2));

        // 渲染树
        this.update(this.treeData);

        // 添加搜索框
        this.addSearchBox();

        // 添加图例
        this.addLegend();
    }

    transformData() {
        // 将数据转换为D3树形结构
        const root = {
            name: "泰国投资报告",
            children: [],
            type: "root",
            status: "pending"
        };

        // 按章节号分组
        const chapters = {};

        this.data.sections.forEach(section => {
            const parts = section.section_number.split('.');
            const chapterKey = parts[0];

            if (!chapters[chapterKey]) {
                chapters[chapterKey] = {
                    name: `第${chapterKey}章`,
                    children: [],
                    type: "chapter",
                    status: "pending"
                };
            }

            // 创建section节点
            const sectionNode = {
                name: section.section_number + ' ' + section.title.replace(/^\d+\.\d+\.\d+\s*/, ''),
                children: [],
                type: "section",
                data: section,
                status: section.review_status
            };

            // 添加链接节点
            section.links.forEach(link => {
                const linkNode = {
                    name: link.url.length > 40 ? link.url.substring(0, 40) + '...' : link.url,
                    children: [],
                    type: "link",
                    data: link,
                    status: "pending",
                    fullUrl: link.url
                };

                // 添加描述节点
                if (link.description) {
                    const descNode = {
                        name: link.description.length > 30 ? link.description.substring(0, 30) + '...' : link.description,
                        type: "description",
                        data: link,
                        status: "pending",
                        fullDescription: link.description
                    };
                    linkNode.children.push(descNode);
                }

                sectionNode.children.push(linkNode);
            });

            chapters[chapterKey].children.push(sectionNode);
        });

        // 按章节号排序并添加到根节点
        const sortedChapters = Object.keys(chapters).sort((a, b) => parseInt(a) - parseInt(b));
        sortedChapters.forEach(key => {
            root.children.push(chapters[key]);
        });

        return root;
    }

    update(source) {
        // 计算树布局
        const treeData = this.tree(this.root = d3.hierarchy(this.treeData));
        const nodes = treeData.descendants();
        const links = treeData.links();

        // 固定左起始位置
        nodes.forEach(d => {
            d.y = d.depth * 280;
        });

        // 渲染链接
        const link = this.g.selectAll('.link')
            .data(links, d => d.target.data.name);

        // 添加新链接
        const linkEnter = link.enter()
            .append('path')
            .attr('class', 'link')
            .attr('d', d3.linkHorizontal()
                .x(d => d.y)
                .y(d => d.x));

        // 更新链接
        link.merge(linkEnter)
            .transition()
            .duration(this.duration)
            .attr('d', d3.linkHorizontal()
                .x(d => d.y)
                .y(d => d.x));

        // 删除旧链接
        link.exit()
            .transition()
            .duration(this.duration)
            .attr('d', d3.linkHorizontal()
                .x(d => d.y)
                .y(d => d.x))
            .remove();

        // 渲染节点
        const node = this.g.selectAll('.node')
            .data(nodes, d => d.data.name);

        // 添加新节点
        const nodeEnter = node.enter()
            .append('g')
            .attr('class', d => `node node-${d.data.status || 'pending'}`)
            .attr('transform', d => `translate(${d.y},${d.x})`)
            .on('click', (event, d) => this.handleClick(event, d));

        // 添加节点矩形
        nodeEnter.append('rect')
            .attr('width', d => this.getNodeWidth(d))
            .attr('height', this.nodeHeight)
            .attr('x', d => -this.getNodeWidth(d) / 2)
            .attr('y', -this.nodeHeight / 2)
            .attr('rx', 8)
            .attr('ry', 8);

        // 添加节点文本
        nodeEnter.append('text')
            .attr('dy', '0.35em')
            .attr('text-anchor', 'middle')
            .text(d => this.getNodeLabel(d));

        // 添加展开/折叠指示器
        nodeEnter.filter(d => d.children || d._children)
            .append('text')
            .attr('class', 'expand-indicator')
            .attr('x', d => this.getNodeWidth(d) / 2 - 15)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'middle')
            .text(d => d.children ? '−' : '+');

        // 更新节点
        const nodeUpdate = node.merge(nodeEnter);

        nodeUpdate.transition()
            .duration(this.duration)
            .attr('transform', d => `translate(${d.y},${d.x})`);

        nodeUpdate.select('rect')
            .attr('width', d => this.getNodeWidth(d))
            .attr('x', d => -this.getNodeWidth(d) / 2)
            .attr('class', d => this.getNodeClass(d));

        nodeUpdate.select('text')
            .text(d => this.getNodeLabel(d));

        // 删除旧节点
        const nodeExit = node.exit()
            .transition()
            .duration(this.duration)
            .attr('transform', d => `translate(${d.y},${d.x})`)
            .remove();

        // 保存节点位置
        nodes.forEach(d => {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    getNodeWidth(d) {
        const textLength = d.data.name.length;
        if (d.data.type === 'root') return 180;
        if (d.data.type === 'chapter') return 160;
        if (d.data.type === 'section') return 220;
        if (d.data.type === 'link') return 250;
        if (d.data.type === 'description') return 200;
        return 200;
    }

    getNodeLabel(d) {
        const name = d.data.name;
        const maxWidth = 30;
        if (name.length > maxWidth) {
            return name.substring(0, maxWidth) + '...';
        }
        return name;
    }

    getNodeClass(d) {
        const status = d.data.status || 'pending';
        return `node-status-${status}`;
    }

    handleClick(event, d) {
        event.stopPropagation();

        // 如果有子节点，切换展开/折叠
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else if (d._children) {
            d.children = d._children;
            d._children = null;
        }

        this.update(d);

        // 触发点击回调
        if (this.onNodeClick) {
            this.onNodeClick(d.data);
        }
    }

    addSearchBox() {
        const searchDiv = document.createElement('div');
        searchDiv.className = 'search-box';
        searchDiv.innerHTML = `
            <input type="text" id="search-input" placeholder="搜索章节或链接...">
        `;
        this.container.appendChild(searchDiv);

        // 添加搜索功能
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', (e) => {
            this.search(e.target.value);
        });
    }

    search(query) {
        if (!query) {
            // 重置所有节点样式
            this.g.selectAll('.node')
                .style('opacity', 1);
            return;
        }

        query = query.toLowerCase();

        this.g.selectAll('.node')
            .style('opacity', d => {
                const name = d.data.name.toLowerCase();
                const fullUrl = d.data.fullUrl ? d.data.fullUrl.toLowerCase() : '';
                const fullDesc = d.data.fullDescription ? d.data.fullDescription.toLowerCase() : '';

                if (name.includes(query) || fullUrl.includes(query) || fullDesc.includes(query)) {
                    return 1;
                }
                return 0.2;
            });
    }

    addLegend() {
        // 图例已通过HTML添加
    }

    // 更新节点状态
    updateNodeStatus(nodeId, status) {
        const findAndUpdate = (node) => {
            if (node.data && node.data.id === nodeId) {
                node.data.status = status;
                return true;
            }
            if (node.children) {
                for (let child of node.children) {
                    if (findAndUpdate(child)) return true;
                }
            }
            if (node._children) {
                for (let child of node._children) {
                    if (findAndUpdate(child)) return true;
                }
            }
            return false;
        };

        findAndUpdate(this.root);
        this.update(this.root);
    }

    // 展开所有节点
    expandAll() {
        const expand = (d) => {
            if (d._children) {
                d.children = d._children;
                d._children = null;
            }
            if (d.children) {
                d.children.forEach(expand);
            }
        };

        expand(this.root);
        this.update(this.root);
    }

    // 折叠所有节点
    collapseAll() {
        const collapse = (d) => {
            if (d.children && d.depth > 0) {
                d._children = d.children;
                d.children = null;
            }
            if (d._children) {
                d._children.forEach(collapse);
            }
        };

        this.root.children.forEach(collapse);
        this.update(this.root);
    }

    // 聚焦到特定节点
    focusNode(nodeId) {
        const findNode = (node) => {
            if (node.data && node.data.id === nodeId) {
                return node;
            }
            if (node.children) {
                for (let child of node.children) {
                    const found = findNode(child);
                    if (found) return found;
                }
            }
            return null;
        };

        const targetNode = findNode(this.root);
        if (targetNode) {
            // 展开路径
            let current = targetNode;
            while (current.parent) {
                if (current.parent._children) {
                    current.parent.children = current.parent._children;
                    current.parent._children = null;
                }
                current = current.parent;
            }

            this.update(this.root);

            // 平移到节点位置
            const transform = d3.zoomIdentity
                .translate(this.container.clientWidth / 2 - targetNode.y, this.container.clientHeight / 2 - targetNode.x)
                .scale(1);

            this.svg.transition()
                .duration(750)
                .call(d3.zoom().transform, transform);
        }
    }

    // 销毁
    destroy() {
        this.container.innerHTML = '';
    }
}

// 导出
window.MindmapRenderer = MindmapRenderer;
