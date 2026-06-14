# 数据连通性分析报告

## 数据源

| 页面 | 数据源 | 状态 |
|------|--------|------|
| 思维导图审核 (index.html) | `data.js` | ✅ 共享 |
| 实体覆盖检查 (entities.html) | `data.js` | ✅ 共享 |

**结论**：两个页面共享同一个数据源 `data.js`。

---

## 审核状态存储

### 思维导图审核页面 (index.html)

**存储位置**：`localStorage.getItem('thailand_report_review')`

**存储内容**：
```json
{
  "section_37": {
    "status": "reviewed",  // pending, reviewed, need-more
    "notes": [
      {
        "text": "审核注释内容",
        "time": "2024/6/14 22:30:00"
      }
    ],
    "coverage_status": "complete"  // complete, partial, missing
  }
}
```

**功能**：
- 标记section审核状态（已审核/待审核/需补充）
- 添加审核注释
- 评估内容覆盖情况
- 导出审核报告

### 实体覆盖检查页面 (entities.html)

**存储位置**：无独立存储

**功能**：
- 显示实体统计（总数、有链接覆盖数、无链接覆盖数）
- 按类型过滤（法律/法案/政策）
- 按覆盖状态过滤（有链接/无链接）
- 搜索功能

**数据来源**：
- 直接读取 `data.js` 中的 `sections[].features[]` 和 `sections[].links[]`
- 不读取思维导图页面的审核状态

---

## 联动分析

### 当前状态

| 功能 | 思维导图页面 | 实体覆盖检查页面 | 联动 |
|------|-------------|-----------------|------|
| 数据源 | data.js | data.js | ✅ 共享 |
| 审核状态 | localStorage | 无 | ❌ 不联动 |
| 实体显示 | 侧边栏 | 表格 | ✅ 一致 |
| 链接显示 | 侧边栏 | 表格 | ✅ 一致 |

### 问题

1. **审核状态不同步**：
   - 思维导图页面的审核状态存储在 `localStorage` 中
   - 实体覆盖检查页面不读取这个状态
   - 用户在思维导图页面标记的审核状态，在实体覆盖检查页面看不到

2. **实体覆盖检查页面缺少审核功能**：
   - 只能查看实体是否有链接覆盖
   - 无法标记实体的审核状态
   - 无法添加注释

---

## 建议改进

### 方案1：统一审核状态存储

在两个页面中共享同一个 localStorage key：

```javascript
// entities.html 中添加
const reviewData = JSON.parse(localStorage.getItem('thailand_report_review') || '{}');

// 在显示实体时，显示对应的审核状态
```

### 方案2：实体覆盖检查页面添加审核功能

在 entities.html 中添加：
- 实体审核状态标记
- 实体注释功能
- 与思维导图页面同步

### 方案3：创建统一的数据管理模块

创建一个共享的 JavaScript 模块：

```javascript
// shared-data.js
class ReviewDataManager {
    constructor() {
        this.storageKey = 'thailand_report_review';
    }

    getStatus(entityId) {
        const data = this.loadData();
        return data[entityId]?.status || 'pending';
    }

    setStatus(entityId, status) {
        const data = this.loadData();
        if (!data[entityId]) {
            data[entityId] = { status: 'pending', notes: [] };
        }
        data[entityId].status = status;
        this.saveData(data);
    }

    loadData() {
        return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
    }

    saveData(data) {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }
}
```

---

## 总结

| 项目 | 状态 | 说明 |
|------|------|------|
| 数据源 | ✅ 联动 | 两个页面共享 data.js |
| 审核状态 | ❌ 不联动 | 实体页面不读取审核状态 |
| 实体显示 | ✅ 一致 | 两个页面显示相同的实体 |
| 链接显示 | ✅ 一致 | 两个页面显示相同的链接 |

**结论**：数据源是联动的，但审核状态不联动。需要改进实体覆盖检查页面，使其能读取和显示思维导图页面的审核状态。
