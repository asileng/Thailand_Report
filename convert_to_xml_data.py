"""
将data.js转换为XML格式
"""
import json
import xml.etree.ElementTree as ET
from xml.dom import minidom

def json_to_xml(json_path, xml_path):
    """将JSON数据转换为XML格式"""
    # 读取JSON
    with open(json_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # 跳过注释行，提取JSON部分
    json_lines = []
    for line in lines:
        if line.strip().startswith('//'):
            continue
        json_lines.append(line)

    json_str = ''.join(json_lines).strip()
    # 移除 const reportData = 和结尾的 ;
    if json_str.startswith('const reportData = '):
        json_str = json_str[len('const reportData = '):]
    if json_str.endswith(';'):
        json_str = json_str[:-1]

    data = json.loads(json_str)

    # 创建XML根元素
    root = ET.Element("report")
    root.set("title", data.get("title", ""))
    root.set("subtitle", data.get("subtitle", ""))

    # 添加sections
    sections_elem = ET.SubElement(root, "sections")

    for section in data.get("sections", []):
        section_elem = ET.SubElement(sections_elem, "section")
        section_elem.set("id", section.get("id", ""))
        section_elem.set("section_number", section.get("section_number", ""))
        section_elem.set("review_status", section.get("review_status", "pending"))

        # 标题
        title_elem = ET.SubElement(section_elem, "title")
        title_elem.text = section.get("title", "")

        # 内容
        content_elem = ET.SubElement(section_elem, "content")
        content_elem.text = section.get("content", "")

        # 链接
        links_elem = ET.SubElement(section_elem, "links")
        for link in section.get("links", []):
            link_elem = ET.SubElement(links_elem, "link")
            link_elem.set("id", link.get("id", ""))
            link_elem.set("source_type", link.get("source_type", ""))
            link_elem.set("content_type", link.get("content_type", ""))

            url_elem = ET.SubElement(link_elem, "url")
            url_elem.text = link.get("url", "")

            desc_elem = ET.SubElement(link_elem, "description")
            desc_elem.text = link.get("description", "")

        # 实体
        features_elem = ET.SubElement(section_elem, "features")
        for feature in section.get("features", []):
            feature_elem = ET.SubElement(features_elem, "feature")
            feature_elem.set("type", feature.get("type", ""))

            name_elem = ET.SubElement(feature_elem, "name")
            name_elem.text = feature.get("name", "")

            if feature.get("year"):
                year_elem = ET.SubElement(feature_elem, "year")
                year_elem.text = feature.get("year", "")

    # 添加审核数据（初始为空）
    review_elem = ET.SubElement(root, "review_data")

    # 格式化XML
    xml_str = minidom.parseString(ET.tostring(root, encoding='unicode')).toprettyxml(indent="  ")

    # 保存XML
    with open(xml_path, 'w', encoding='utf-8') as f:
        f.write(xml_str)

    print(f"已转换 {len(data.get('sections', []))} 个section")
    print(f"XML文件已保存到: {xml_path}")

if __name__ == "__main__":
    json_to_xml("data.js", "data.xml")
