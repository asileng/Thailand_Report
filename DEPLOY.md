# 部署说明

## 仓库信息
- **GitHub仓库**: https://github.com/asileng/Thailand_Report
- **类型**: 私有仓库

## 手动推送步骤

由于网络问题，需要手动执行以下命令：

```bash
# 1. 进入项目目录
cd "D:\task\科研\LLM-evaluation\走出去报告\两人一组\两人一组\Thailand_Report"

# 2. 推送代码
git push -u origin master
```

## 启用 GitHub Pages

1. 访问 https://github.com/asileng/Thailand_Report/settings/pages
2. 在 "Source" 部分选择：
   - Branch: `master`
   - Folder: `/ (root)`
3. 点击 "Save"

## 访问网站

部署完成后，可通过以下地址访问：
```
https://asileng.github.io/Thailand_Report/
```

## 功能说明

### 思维导图交互
- **点击节点**: 展开/折叠子节点
- **双击节点**: 在侧边栏显示详细信息
- **鼠标滚轮**: 缩放导图
- **拖拽**: 平移导图

### 审核功能
- **状态标记**: 每个section可标记为"已审核/待审核/需补充"
- **添加注释**: 点击"添加注释"按钮记录审核意见
- **内容对比**: 点击"对比"按钮查看原文与参考资料对比
- **导出报告**: 点击"导出审核报告"下载审核结果

### 搜索功能
- 使用顶部搜索框搜索章节或链接
- 支持模糊匹配

### 快捷键
- `Esc`: 关闭侧边栏和模态框

## 数据保存

审核进度自动保存在浏览器本地存储中，刷新页面不会丢失。

如需跨设备同步，可使用"导出审核报告"功能，然后在新设备上导入。
