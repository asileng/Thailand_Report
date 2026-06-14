// 多文档思维导图渲染模块
class MindmapRenderer {
    constructor(container, data, docId) {
        this.container = container;
        this.data = data;
        this.docId = docId;
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
        this.container.innerHTML = '';

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.svg = d3.select(this.container)
            .append('svg')
            .attr('class', 'mindmap-svg')
            .attr('width', width)
            .attr('height', height);

        const zoom = d3.zoom()
            .scaleExtent([0.3, 3])
            .on('zoom', (event) => {
                this.g.attr('transform', event.transform);
            });

        this.svg.call(zoom);

        this.g = this.svg.append('g')
            .attr('transform', `translate(100, ${height / 2})`);

        this.treeData = this.transformData();

        this.tree = d3.tree()
            .nodeSize([60, 280])
            .separation((a, b) => (a.parent === b.parent ? 1 : 1.2));

        this.update(this.treeData);
        this.addSearchBox();
    }

    transformData() {
        const doc = this.data;
        const root = {
            name: doc.name,
            children: [],
            type: "root",
            status: "pending",
            docId: this.docId
        };

        // 按 parent 分组 sections
        const groups = {};
        doc.sections.forEach((section, idx) => {
            const groupKey = section.parent || '__root__';
            if (!groups[groupKey]) {
                groups[groupKey] = {
                    name: groupKey || '概述',
                    children: [],
                    type: "chapter",
                    status: "pending"
                };
            }

            const sectionNode = {
                name: (section.number ? section.number + '. ' : '') + section.title,
                children: [],
                type: "section",
                data: { ...section, id: `${this.docId}_section_${idx}`, index: idx },
                status: "pending"
            };

            // 添加事件节点（属于该 section 的事件）
            const sectionEvents = doc.events.filter(e => e.domain === section.title);
            sectionEvents.forEach((evt, evtIdx) => {
                const eventNode = {
                    name: evt.description.length > 40 ? evt.description.substring(0, 40) + '...' : evt.description,
                    children: [],
                    type: "event",
                    data: { ...evt, id: `${this.docId}_event_${idx}_${evtIdx}` },
                    status: "pending"
                };
                sectionNode.children.push(eventNode);
            });

            groups[groupKey].children.push(sectionNode);
        });

        // 添加分组到根节点
        Object.values(groups).forEach(group => {
            if (group.children.length > 0) {
                root.children.push(group);
            }
        });

        return root;
    }

    update(source) {
        const treeData = this.tree(this.root = d3.hierarchy(this.treeData));
        const nodes = treeData.descendants();
        const links = treeData.links();

        nodes.forEach(d => {
            d.y = d.depth * 280;
        });

        // 渲染链接
        const link = this.g.selectAll('.link')
            .data(links, d => d.target.data.name);

        const linkEnter = link.enter()
            .append('path')
            .attr('class', 'link')
            .attr('d', d3.linkHorizontal()
                .x(d => d.y)
                .y(d => d.x));

        link.merge(linkEnter)
            .transition()
            .duration(this.duration)
            .attr('d', d3.linkHorizontal()
                .x(d => d.y)
                .y(d => d.x));

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

        const nodeEnter = node.enter()
            .append('g')
            .attr('class', d => `node node-${d.data.status || 'pending'}`)
            .attr('transform', d => `translate(${d.y},${d.x})`)
            .on('click', (event, d) => this.handleClick(event, d));

        nodeEnter.append('rect')
            .attr('width', d => this.getNodeWidth(d))
            .attr('height', this.nodeHeight)
            .attr('x', d => -this.getNodeWidth(d) / 2)
            .attr('y', -this.nodeHeight / 2)
            .attr('rx', 8)
            .attr('ry', 8);

        nodeEnter.append('text')
            .attr('dy', '0.35em')
            .attr('text-anchor', 'middle')
            .text(d => this.getNodeLabel(d));

        nodeEnter.filter(d => d.children || d._children)
            .append('text')
            .attr('class', 'expand-indicator')
            .attr('x', d => this.getNodeWidth(d) / 2 - 15)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'middle')
            .text(d => d.children ? '−' : '+');

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

        const nodeExit = node.exit()
            .transition()
            .duration(this.duration)
            .attr('transform', d => `translate(${d.y},${d.x})`)
            .remove();

        nodes.forEach(d => {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    getNodeWidth(d) {
        if (d.data.type === 'root') return 180;
        if (d.data.type === 'chapter') return 200;
        if (d.data.type === 'section') return 240;
        if (d.data.type === 'event') return 260;
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
        const statusClassMap = {
            'pending': 'node-pending',
            'reviewed': 'node-reviewed',
            'need-more': 'node-need-more'
        };
        return statusClassMap[status] || 'node-pending';
    }

    handleClick(event, d) {
        event.stopPropagation();

        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else if (d._children) {
            d.children = d._children;
            d._children = null;
        }

        this.update(d);

        if (this.onNodeClick) {
            this.onNodeClick(d.data);
        }
    }

    addSearchBox() {
        const searchDiv = document.createElement('div');
        searchDiv.className = 'search-box';
        searchDiv.innerHTML = `
            <input type="text" id="search-input" placeholder="搜索章节或事件...">
        `;
        this.container.appendChild(searchDiv);

        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', (e) => {
            this.search(e.target.value);
        });
    }

    search(query) {
        if (!query) {
            this.g.selectAll('.node').style('opacity', 1);
            return;
        }

        query = query.toLowerCase();

        this.g.selectAll('.node')
            .style('opacity', d => {
                const name = d.data.name.toLowerCase();
                const content = d.data.data?.content ? d.data.data.content.toLowerCase() : '';
                const desc = d.data.data?.description ? d.data.data.description.toLowerCase() : '';

                if (name.includes(query) || content.includes(query) || desc.includes(query)) {
                    return 1;
                }
                return 0.2;
            });
    }

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
            let current = targetNode;
            while (current.parent) {
                if (current.parent._children) {
                    current.parent.children = current.parent._children;
                    current.parent._children = null;
                }
                current = current.parent;
            }

            this.update(this.root);

            const transform = d3.zoomIdentity
                .translate(this.container.clientWidth / 2 - targetNode.y, this.container.clientHeight / 2 - targetNode.x)
                .scale(1);

            this.svg.transition()
                .duration(750)
                .call(d3.zoom().transform, transform);
        }
    }

    destroy() {
        this.container.innerHTML = '';
    }
}

window.MindmapRenderer = MindmapRenderer;
