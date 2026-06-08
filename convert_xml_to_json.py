import xml.etree.ElementTree as ET
import json
import re

def clean_text(text):
    """清理文本内容"""
    if not text:
        return ""
    # 移除多余的空白字符
    text = re.sub(r'\s+', ' ', text)
    text = text.strip()
    # 移除页码标记
    text = re.sub(r'泰国（\d{4}年版）\s*\d+', '', text)
    return text

def extract_section_number(header):
    """从标题中提取章节号"""
    if not header:
        return ""
    match = re.search(r'(\d+\.\d+\.\d+)', header)
    if match:
        return match.group(1)
    match = re.search(r'(\d+\.\d+)', header)
    if match:
        return match.group(1)
    match = re.search(r'(\d+)', header)
    if match:
        return match.group(1)
    return ""

def xml_to_json(xml_path, json_path):
    """将XML转换为JSON格式"""
    tree = ET.parse(xml_path)
    root = tree.getroot()

    data = {
        "title": "泰国投资报告 - 参考资料审核",
        "subtitle": "对外投资合作国别（地区）指南-泰国（2025年版）",
        "sections": []
    }

    for section in root.findall('section'):
        section_id = section.get('id')

        header_elem = section.find('header')
        header = clean_text(header_elem.text) if header_elem is not None else ""

        content_elem = section.find('content')
        content = clean_text(content_elem.text) if content_elem is not None else ""

        # 提取章节号
        section_number = extract_section_number(header)

        # 提取链接
        links = []
        i = 1
        while True:
            link_elem = section.find(f'link_{i}')
            if link_elem is None:
                break

            url = link_elem.text.strip() if link_elem.text else ""
            desc_elem = link_elem.find('description')
            description = desc_elem.text.strip() if desc_elem is not None and desc_elem.text else ""

            # 清理URL末尾的标点符号
            url = url.rstrip('.,;:!?|')
            url = url.rstrip('。')  # 移除中文句号

            if url:
                links.append({
                    "id": f"link_{i}",
                    "url": url,
                    "description": description
                })
            i += 1

        section_data = {
            "id": f"section_{section_id}",
            "section_number": section_number,
            "title": header.replace('## ', '').strip(),
            "content": content,
            "links": links,
            "review_status": "pending",  # pending, reviewed, need-more
            "notes": [],
            "coverage_status": None  # complete, partial, missing
        }

        data["sections"].append(section_data)

    # 保存JSON
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"已转换 {len(data['sections'])} 个section")
    print(f"JSON文件已保存到: {json_path}")

    return data

if __name__ == "__main__":
    xml_path = r"..\参考报告1_chapter5_with_descriptions.xml"
    json_path = "data.js"

    # 读取XML并转换
    data = xml_to_json(xml_path, json_path)

    # 输出为JavaScript变量格式
    with open(json_path, 'w', encoding='utf-8') as f:
        f.write("// 泰国报告审核数据\n")
        f.write("const reportData = ")
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write(";\n")

    print(f"\n数据统计:")
    print(f"- 总章节数: {len(data['sections'])}")

    total_links = sum(len(s['links']) for s in data['sections'])
    print(f"- 总链接数: {total_links}")

    sections_with_links = sum(1 for s in data['sections'] if s['links'])
    print(f"- 含链接的章节: {sections_with_links}")
