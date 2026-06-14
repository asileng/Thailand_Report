import re
import json
import xml.etree.ElementTree as ET

def classify_link_function(url, content_context, description):
    """
    分类链接功能：
    - source_type: 原文来源 / 新闻来源 / 数据来源 / 参考来源
    - content_type: 直接引用 / 相关新闻 / 政策原文 / 统计数据
    """
    url_lower = url.lower()
    desc_lower = description.lower() if description else ''
    context_lower = content_context.lower() if content_context else ''

    # 判断source_type
    source_type = '参考来源'  # 默认

    # 官方政府网站 -> 原文来源
    gov_domains = [
        '.go.th', '.gov.th', '.or.th',
        'mofcom.gov.cn',  # 中国商务部
        'faolex.fao.org',  # 联合国粮农组织
    ]
    if any(domain in url_lower for domain in gov_domains):
        source_type = '原文来源'

    # 新闻/媒体网站 -> 新闻来源
    news_indicators = ['news', 'media', 'press', 'article', 'report']
    if any(indicator in url_lower for indicator in news_indicators):
        source_type = '新闻来源'

    # 判断content_type
    content_type = '参考来源'  # 默认

    # PDF文件通常是政策原文
    if url_lower.endswith('.pdf') or '.pdf' in url_lower:
        content_type = '政策原文'

    # 法律翻译页面 -> 政策原文
    if 'law' in url_lower or 'legal' in url_lower or 'act' in url_lower:
        content_type = '政策原文'

    # 统计/数据页面 -> 统计数据
    if 'stat' in url_lower or 'data' in url_lower or 'index' in url_lower:
        content_type = '统计数据'

    # 根据描述进一步分类
    if description:
        if '法律' in description or '法规' in description or '法案' in description:
            content_type = '政策原文'
        elif '新闻' in description or '报道' in description:
            content_type = '相关新闻'
        elif '统计' in description or '数据' in description:
            content_type = '统计数据'

    # 根据上下文进一步分类
    if content_context:
        if '根据' in content_context or '规定' in content_context:
            if source_type == '原文来源':
                content_type = '政策原文'

    return source_type, content_type

def update_xml_with_link_classification(xml_path, output_path):
    """更新XML，为每个链接添加功能分类"""
    tree = ET.parse(xml_path)
    root = tree.getroot()

    total_links = 0
    classified_links = 0

    for section in root.findall('section'):
        content_elem = section.find('content')
        content_text = content_elem.text if content_elem is not None else ''

        # 处理所有link_n元素
        i = 1
        while True:
            link_elem = section.find(f'link_{i}')
            if link_elem is None:
                break

            url = link_elem.text.strip() if link_elem.text else ''
            desc_elem = link_elem.find('description')
            description = desc_elem.text.strip() if desc_elem is not None and desc_elem.text else ''

            if url:
                total_links += 1

                # 分类链接功能
                source_type, content_type = classify_link_function(url, content_text, description)

                # 添加分类标签
                func_elem = ET.SubElement(link_elem, 'function')
                func_elem.set('source_type', source_type)
                func_elem.set('content_type', content_type)

                classified_links += 1

                # 输出统计
                section_id = section.get('id')
                print(f"Section {section_id}, link_{i}:")
                print(f"  URL: {url[:50]}...")
                print(f"  来源类型: {source_type}")
                print(f"  内容类型: {content_type}")
                print()

            i += 1

    # 保存XML
    tree.write(output_path, encoding='utf-8', xml_declaration=True)

    print(f"\n总计分类 {classified_links} 个链接")
    print(f"输出文件: {output_path}")

    # 统计分类结果
    source_stats = {}
    content_stats = {}

    for section in root.findall('section'):
        i = 1
        while True:
            link_elem = section.find(f'link_{i}')
            if link_elem is None:
                break

            func_elem = link_elem.find('function')
            if func_elem is not None:
                st = func_elem.get('source_type', '未知')
                ct = func_elem.get('content_type', '未知')

                source_stats[st] = source_stats.get(st, 0) + 1
                content_stats[ct] = content_stats.get(ct, 0) + 1

            i += 1

    print("\n=== 分类统计 ===")
    print("\n来源类型统计:")
    for k, v in sorted(source_stats.items(), key=lambda x: -x[1]):
        print(f"  {k}: {v}")

    print("\n内容类型统计:")
    for k, v in sorted(content_stats.items(), key=lambda x: -x[1]):
        print(f"  {k}: {v}")

if __name__ == "__main__":
    xml_path = r"参考报告1_chapter5_with_entities.xml"
    output_path = r"参考报告1_chapter5_final.xml"

    update_xml_with_link_classification(xml_path, output_path)
