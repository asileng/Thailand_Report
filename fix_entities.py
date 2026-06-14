"""
实体修正脚本
自动修正数据中的实体提取错误
"""
import json
import re

def fix_entity_name(name):
    """修正实体名称"""
    if not name:
        return name, None

    original = name

    # 1. 去除换行符
    name = name.replace('\n', ' ').replace('\r', '')

    # 2. 去除多余空格（包括书名号内的空格）
    # 对于《xxx yyy》格式，去除xxx和yyy之间的空格
    if name.startswith('《') and name.endswith('》'):
        inner = name[1:-1]
        # 去除中文字符之间的空格
        inner = re.sub(r'([一-鿿])\s+([一-鿿])', r'\1\2', inner)
        # 去除数字和中文之间的空格
        inner = re.sub(r'([一-鿿])\s+(\d)', r'\1\2', inner)
        inner = re.sub(r'(\d)\s+([一-鿿])', r'\1\2', inner)
        # 去除多个空格
        inner = re.sub(r'\s+', ' ', inner).strip()
        name = f'《{inner}》'
    else:
        # 对于其他格式，去除中文字符之间的空格
        name = re.sub(r'([一-鿿])\s+([一-鿿])', r'\1\2', name)
        name = re.sub(r'([一-鿿])\s+(\d)', r'\1\2', name)
        name = re.sub(r'(\d)\s+([一-鿿])', r'\1\2', name)
        name = re.sub(r'\s+', ' ', name).strip()

    # 3. 去除末尾标点
    name = name.rstrip('，。、；：！？,.;:!?')

    # 4. 修正英文法案格式
    if name == 'FactoryAct':
        name = 'Factory Act'

    # 5. 检查是否需要删除（明显错误）
    delete_patterns = [
        # 截断错误
        r'^0"战略',
        r'^0\d+年提出',
        r'^\d+年\d+月，',
        r'^造数字',
        r'^的南部',
        r'^商务部与',
        r'^EEC\)',
        r'^BCG\（',
        r'^BCG\w*模式投资',
        r'^BCG\w*发展模式高度',
        r'^SEZ\)',
        r'^Zone\)',
        r'^业尽量',
        r'^入驻工业',
        r'^制造分会',
        r'^在泰国特别',
        r'^发展政策',
        r'^动产租赁',
        r'^资促进法',
        r'^通首都',
        r'^当前，',
        r'^【.+】$',
        r'^《泰国》$',
        r'^《指南》$',
        r'^BCG$',
        r'^EEC$',
        r'^经济特区$',
        r'^工业园区$',
        # 以标点开头
        r'^[，。、；：！？,.;:!?]',
        # 以数字加标点开头（如"0"战略）
        r'^\d["""]',
        # 不完整的句子片段
        r'^工业经营者',
        r'^，工业经营者',
        r'^（若设厂',
        r'^《工业园区$',  # 不完整的书名号
        r'^开发、管理',
        r'^的工业园区',
        r'^分为两大类',
        r'^得工业区',
        r'^地退还给',
        r'^府重点打造',
        r'^年，泰国',
        r'^活动。10',
        r'^拉提瓦府',
        r'^前初具规模',
        r'^部来兴府',
        r'^目达汉府',
        r'^部沙缴府',
        r'^）东部达',
        r'^部宋卡府',
        r'^在泰国特别',
        r'^法》第\d+条',
        r'^（\d+）泰国',
        r'^第\d+条：',
        r'^（\d+）工业园区',
        r'^（\d+）中西部',
        r'^（\d+）北部',
        r'^（\d+）东北部',
        r'^（\d+）南部',
        r'^（\d+）东部',
        r'^015年',
        r'^8年\d+月',
        # Zone）和自由业务园区
        r'^Zone\）',
        # EEC）内的
        r'^EEC\）内的',
        # EEC）的定位
        r'^EEC\）的定位',
        # 【边境经济特区
        r'^【边境',
        # 【东部经济走廊特区
        r'^【东部',
        # 【其他经济走廊特区
        r'^【其他',
        # 【特别经济开发区
        r'^【特别',
    ]

    for pattern in delete_patterns:
        if re.match(pattern, name):
            return name, 'DELETE'

    # 6. 检查是否为不完整实体
    # 如果名称以》结尾但没有对应的《，可能是截断
    if name.endswith('》') and '《' not in name:
        return name, 'CHECK'

    # 如果名称包含多余内容（如"。此外，"）
    if '。此外，' in name or '。此外' in name:
        # 截取到第一个句号
        name = name.split('。')[0] + '》'
        if '《' not in name:
            name = '《' + name

    return name, None if name != original else 'UNCHANGED'

def fix_data_file(input_path, output_path):
    """修正data.js文件中的实体"""
    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 提取JSON部分
    json_match = re.search(r'const reportData = ({.*?});', content, re.DOTALL)
    if not json_match:
        print("无法解析data.js文件")
        return

    json_str = json_match.group(1)
    data = json.loads(json_str)

    # 统计
    stats = {
        'total': 0,
        'fixed': 0,
        'deleted': 0,
        'need_check': 0,
        'unchanged': 0
    }

    # 修正实体
    for section in data['sections']:
        if 'features' not in section:
            continue

        new_features = []
        for feature in section['features']:
            stats['total'] += 1
            name = feature['name']

            fixed_name, action = fix_entity_name(name)

            if action == 'DELETE':
                stats['deleted'] += 1
                print(f"[删除] {name}")
                continue
            elif action == 'CHECK':
                stats['need_check'] += 1
                print(f"[需检查] {name}")
                new_features.append(feature)
            elif fixed_name != name:
                stats['fixed'] += 1
                print(f"[修正] {name} -> {fixed_name}")
                feature['name'] = fixed_name
                new_features.append(feature)
            else:
                stats['unchanged'] += 1
                new_features.append(feature)

        section['features'] = new_features

    # 去重
    for section in data['sections']:
        if 'features' not in section:
            continue

        seen = set()
        unique_features = []
        for feature in section['features']:
            name = feature['name']
            if name not in seen:
                seen.add(name)
                unique_features.append(feature)
            else:
                stats['fixed'] += 1
                print(f"[去重] {name}")

        section['features'] = unique_features

    # 输出统计
    print("\n" + "=" * 50)
    print("修正统计:")
    print(f"  总实体数: {stats['total']}")
    print(f"  已修正: {stats['fixed']}")
    print(f"  已删除: {stats['deleted']}")
    print(f"  需检查: {stats['need_check']}")
    print(f"  未变化: {stats['unchanged']}")
    print("=" * 50)

    # 保存修正后的数据
    output_content = f"// 泰国报告审核数据\nconst reportData = {json.dumps(data, ensure_ascii=False, indent=2)};\n"

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(output_content)

    print(f"\n已保存修正后的数据到: {output_path}")

if __name__ == "__main__":
    input_path = "data.js"
    output_path = "data_fixed.js"

    fix_data_file(input_path, output_path)
