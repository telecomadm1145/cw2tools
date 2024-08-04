import json
import csv
import struct
import os

# 定义一个函数来读取JSON文件并将其数据存储到列表中
def read_json_file(json_file):
    prefix = os.path.splitext(os.path.basename(json_file))[0]
    data_list = []

    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    for key, (name, value) in data.items():
        new_key = f"{prefix}-{key}"
        data_list.append((new_key, name))
    
    return data_list

# 定义一个函数来读取CSV文件并将其数据存储到列表中
def read_csv_file(csv_file):
    prefix = os.path.splitext(os.path.basename(csv_file))[0]
    data_list = []

    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            key, name, pad = row
            new_key = f"{key}"
            data_list.append((new_key, name))
    
    return data_list

# 定义一个函数来将数据列表写入二进制文件
def write_to_binary(data_list, binary_file):
    object_count = len(data_list)

    with open(binary_file, 'wb') as f:
        # 写入对象列表长度 (8字节)
        f.write(struct.pack('Q', object_count))

        for key, name in data_list:
            # 写入键 (8字节字符串)
            key_bytes = key.encode('utf-8')
            key_bytes_padded = key_bytes.ljust(8, b'\x00')[:8]
            f.write(key_bytes_padded)

            # 写入名称长度 (8字节)
            name_bytes = name.encode('utf-8')
            name_length = len(name_bytes)
            f.write(struct.pack('Q', name_length))

            # 写入名称字符串 (y字节)
            f.write(name_bytes)

# 主函数，处理多个JSON和CSV文件
def multiple_files_to_binary(json_files, csv_files, binary_file):
    all_data = []

    for csv_file in csv_files:
        all_data.extend(read_csv_file(csv_file))

    for json_file in json_files:
        all_data.extend(read_json_file(json_file))

    write_to_binary(all_data, binary_file)

# 使用示例
json_files = ['EY.json', 'CY.json']  # 添加更多的JSON文件路径
csv_files = ['main.csv']  # 添加更多的CSV文件路径
binary_file = 'combined_output.bin'
multiple_files_to_binary(json_files, csv_files, binary_file)
