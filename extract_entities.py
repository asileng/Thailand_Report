import re
import json
import xml.etree.ElementTree as ET

def extract_policy_entities(text):
    """
    从文本中提取政策/法律/法案实体
    返回实体列表，每个实体包含：name, type, year
    """
    entities = []

    # 匹配模式1：带年份的法律/法案
    # 例如：1979年《出口和进口商品法》、2017年《公共采购和供货监督法》
    pattern1 = r'(\d{4})\s*年\s*《([^》]+)》'
    matches1 = re.findall(pattern1, text)
    for year, name in matches1:
        entities.append({
            'name': f'{year}年《{name}》',
            'type': '法律',
            'year': year,
            'short_name': name
        })

    # 匹配模式2：不带年份的法律/法案
    # 例如：《投资促进法》《东部经济走廊特区法案》
    pattern2 = r'《([^》]+)》'
    matches2 = re.findall(pattern2, text)
    for name in matches2:
        # 避免重复添加
        full_name = f'《{name}》'
        if not any(e['short_name'] == name for e in entities):
            # 尝试从上下文提取年份
            year_match = re.search(r'(\d{4})\s*年.*?' + re.escape(name), text)
            year = year_match.group(1) if year_match else None
            entities.append({
                'name': full_name,
                'type': '法律',
                'year': year,
                'short_name': name
            })

    # 匹配模式3：法案名称（英文）
    # 例如：Investment Promotion Act B.E. 1977, Customs Act
    pattern3 = r'([A-Z][a-zA-Z\s]+Act(?:\s+B\.E\.\s+\d{4})?)'
    matches3 = re.findall(pattern3, text)
    for name in matches3:
        name = name.strip()
        if len(name) > 5:  # 过滤太短的匹配
            entities.append({
                'name': name,
                'type': '法案',
                'year': None,
                'short_name': name
            })

    # 匹配模式4：政策名称
    # 例如：泰国4.0战略、东部经济走廊（EEC）
    policy_patterns = [
        r'([泰中日美英德法]国\d+(?:\.\d+)?战略)',
        r'([^\s]{2,10}(?:特区|走廊|园区|开发区|自贸区))',
        r'((?:BCG|EEC|SEZ)[^\s]*)',
    ]
    for pattern in policy_patterns:
        matches = re.findall(pattern, text)
        for name in matches:
            if not any(e['name'] == name for e in entities):
                entities.append({
                    'name': name,
                    'type': '政策',
                    'year': None,
                    'short_name': name
                })

    # 去重
    seen = set()
    unique_entities = []
    for entity in entities:
        key = entity['name']
        if key not in seen:
            seen.add(key)
            unique_entities.append(entity)

    return unique_entities

def extract_entities_from_xml(xml_path, output_path):
    """从XML文件中提取实体并添加features标签"""
    tree = ET.parse(xml_path)
    root = tree.getroot()

    total_entities = 0

    for section in root.findall('section'):
        content_elem = section.find('content')
        if content_elem is None or content_elem.text is None:
            continue

        content = content_elem.text
        header = section.find('header')
        header_text = header.text if header is not None else ''

        # 提取实体
        entities = extract_policy_entities(content)

        if entities:
            # 创建features元素
            features_elem = ET.SubElement(section, 'features')

            for entity in entities:
                feature_elem = ET.SubElement(features_elem, 'feature')
                feature_elem.set('type', entity['type'])

                name_elem = ET.SubElement(feature_elem, 'name')
                name_elem.text = entity['name']

                if entity['year']:
                    year_elem = ET.SubElement(feature_elem, 'year')
                    year_elem.text = entity['year']

                if entity['short_name'] != entity['name']:
                    short_elem = ET.SubElement(feature_elem, 'short_name')
                    short_elem.text = entity['short_name']

            total_entities += len(entities)

            # 输出统计
            section_id = section.get('id')
            print(f"Section {section_id}: {header_text}")
            print(f"  提取 {len(entities)} 个实体:")
            for e in entities:
                print(f"    - [{e['type']}] {e['name']}")
            print()

    # 保存XML
    tree.write(output_path, encoding='utf-8', xml_declaration=True)

    print(f"\n总计提取 {total_entities} 个实体")
    print(f"输出文件: {output_path}")

    return total_entities

if __name__ == "__main__":
    xml_path = r"参考报告1_chapter5_with_descriptions.xml"
    output_path = r"参考报告1_chapter5_with_entities.xml"

    extract_entities_from_xml(xml_path, output_path)
